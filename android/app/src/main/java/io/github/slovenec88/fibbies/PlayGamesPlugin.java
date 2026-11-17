package io.github.slovenec88.fibbies;

import android.app.Activity;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import com.google.android.gms.tasks.Task;

import java.nio.charset.StandardCharsets;

/**
 * Optional cloud save through Google Play Games "Saved Games". Free for the player and the developer:
 * the data lives in the player's own Play Games account. It only switches on when the build has a
 * Play Games project id (gradle property playGamesAppId), so builds without one keep working offline.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private boolean possible = false;
    private boolean ready = false;

    @Override
    public void load() {
        possible = configured()
            && GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext()) == ConnectionResult.SUCCESS;
    }

    /** Starts Play Games. Called from JS only once the player turns cloud save on, so nobody else
     *  gets an automatic Play Games sign-in at launch. */
    @PluginMethod
    public void init(PluginCall call) {
        if (!possible) { call.reject("unavailable"); return; }
        if (!ready) {
            try {
                PlayGamesSdk.initialize(getContext());
                ready = true;
            } catch (Exception e) {
                call.reject(String.valueOf(e));
                return;
            }
        }
        call.resolve();
    }

    private boolean configured() {
        int id = getContext().getResources().getIdentifier("game_services_project_id", "string", getContext().getPackageName());
        return id != 0 && !TextUtils.isEmpty(getContext().getString(id).trim());
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", possible);
        call.resolve(r);
    }

    @PluginMethod
    public void isSignedIn(PluginCall call) {
        if (!ready) { call.reject("unavailable"); return; }
        Activity a = getActivity();
        PlayGames.getGamesSignInClient(a).isAuthenticated()
            .addOnCompleteListener(t -> withPlayer(call, t.isSuccessful() && t.getResult().isAuthenticated()));
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready) { call.reject("unavailable"); return; }
        Activity a = getActivity();
        PlayGames.getGamesSignInClient(a).signIn()
            .addOnCompleteListener(t -> withPlayer(call, t.isSuccessful() && t.getResult().isAuthenticated()));
    }

    private void withPlayer(PluginCall call, boolean signedIn) {
        JSObject r = new JSObject();
        r.put("signedIn", signedIn);
        if (!signedIn) { call.resolve(r); return; }
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(p -> {
            if (p.isSuccessful() && p.getResult() != null) r.put("name", p.getResult().getDisplayName());
            call.resolve(r);
        });
    }

    /** Opens the slot, resolving any conflict in favour of the most recently modified copy. */
    private Task<Snapshot> open(SnapshotsClient c, String name) {
        return c.open(name, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED)
            .continueWithTask(t -> {
                SnapshotsClient.DataOrConflict<Snapshot> d = t.getResult();
                if (!d.isConflict()) return com.google.android.gms.tasks.Tasks.forResult(d.getData());
                SnapshotsClient.SnapshotConflict k = d.getConflict();
                return c.resolveConflict(k.getConflictId(), k.getSnapshot()).continueWith(t2 -> {
                    SnapshotsClient.DataOrConflict<Snapshot> d2 = t2.getResult();
                    if (d2.isConflict()) {
                        c.discardAndClose(d2.getConflict().getSnapshot());
                        c.discardAndClose(d2.getConflict().getConflictingSnapshot());
                        throw new IllegalStateException("conflict");
                    }
                    return d2.getData();
                });
            });
    }

    @PluginMethod
    public void load(PluginCall call) {
        if (!ready) { call.reject("unavailable"); return; }
        String name = call.getString("name", "save");
        SnapshotsClient c = PlayGames.getSnapshotsClient(getActivity());
        open(c, name).addOnCompleteListener(t -> {
            if (!t.isSuccessful()) { call.reject(String.valueOf(t.getException())); return; }
            Snapshot s = t.getResult();
            JSObject r = new JSObject();
            try {
                byte[] b = s.getSnapshotContents().readFully();
                r.put("data", b == null || b.length == 0 ? null : new String(b, StandardCharsets.UTF_8));
            } catch (Exception e) {
                call.reject(String.valueOf(e));
                return;
            } finally {
                c.discardAndClose(s);
            }
            call.resolve(r);
        });
    }

    @PluginMethod
    public void save(PluginCall call) {
        if (!ready) { call.reject("unavailable"); return; }
        String name = call.getString("name", "save");
        String data = call.getString("data", "");
        String desc = call.getString("description", "Fibbies");
        SnapshotsClient c = PlayGames.getSnapshotsClient(getActivity());
        open(c, name).addOnCompleteListener(t -> {
            if (!t.isSuccessful()) { call.reject(String.valueOf(t.getException())); return; }
            Snapshot s = t.getResult();
            boolean written;
            try {
                written = s.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                written = false;
            }
            if (!written) {
                c.discardAndClose(s);
                call.reject("write failed");
                return;
            }
            SnapshotMetadataChange meta = new SnapshotMetadataChange.Builder().setDescription(desc).build();
            c.commitAndClose(s, meta).addOnCompleteListener(t2 -> {
                if (t2.isSuccessful()) call.resolve();
                else call.reject(String.valueOf(t2.getException()));
            });
        });
    }
}
