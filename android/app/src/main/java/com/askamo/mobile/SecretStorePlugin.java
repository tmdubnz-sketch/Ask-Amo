package com.askamo.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecretStore")
public class SecretStorePlugin extends Plugin {
    private static final String SECURE_PREFS_NAME = "ask_amo_secure_secrets";
    private static final String LEGACY_PREFS_NAME = "CapacitorStorage";
    private static final String TAG = "SecretStore";
    private static final String[] KNOWN_SECRET_KEYS = new String[] {
        "amo_groq_api_key",
        "amo_openrouter_api_key",
        "amo_openai_api_key",
        "amo_gemini_api_key"
    };

    private SharedPreferences securePreferences;

    @Override
    public void load() {
        try {
            migrateKnownLegacySecrets();
        } catch (Exception exception) {
            Log.w(TAG, "load:migrateKnownLegacySecrets failed", exception);
        }
    }

    @PluginMethod
    public void getSecret(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("key is required");
            return;
        }

        try {
            SharedPreferences secure = ensureSecurePreferences();
            String value = secure.getString(key, null);

            if ((value == null || value.trim().isEmpty())) {
                SharedPreferences legacy = getContext().getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE);
                String legacyValue = legacy.getString(key, null);
                if (legacyValue != null && !legacyValue.trim().isEmpty()) {
                    secure.edit().putString(key, legacyValue).apply();
                    legacy.edit().remove(key).apply();
                    value = legacyValue;
                }
            }

            JSObject result = new JSObject();
            result.put("value", value != null ? value : "");
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Failed to read secret", exception);
        }
    }

    @PluginMethod
    public void setSecret(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");

        if (key == null || key.trim().isEmpty()) {
            call.reject("key is required");
            return;
        }

        if (value == null) {
            call.reject("value is required");
            return;
        }

        try {
            SharedPreferences secure = ensureSecurePreferences();
            secure.edit().putString(key, value).apply();
            getContext().getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE).edit().remove(key).apply();
            call.resolve();
        } catch (Exception exception) {
            call.reject("Failed to write secret", exception);
        }
    }

    @PluginMethod
    public void removeSecret(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("key is required");
            return;
        }

        try {
            SharedPreferences secure = ensureSecurePreferences();
            secure.edit().remove(key).apply();
            getContext().getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE).edit().remove(key).apply();
            call.resolve();
        } catch (Exception exception) {
            call.reject("Failed to remove secret", exception);
        }
    }

    private SharedPreferences ensureSecurePreferences() {
        if (securePreferences != null) {
            return securePreferences;
        }

        try {
            MasterKey masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

            securePreferences = EncryptedSharedPreferences.create(
                getContext(),
                SECURE_PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            return securePreferences;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to initialize encrypted secret storage", exception);
        }
    }

    private void migrateKnownLegacySecrets() {
        SharedPreferences secure = ensureSecurePreferences();
        SharedPreferences legacy = getContext().getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor legacyEditor = legacy.edit();
        boolean changed = false;

        for (String key : KNOWN_SECRET_KEYS) {
            String secureValue = secure.getString(key, null);
            if (secureValue != null && !secureValue.trim().isEmpty()) {
                if (legacy.contains(key)) {
                    legacyEditor.remove(key);
                    changed = true;
                }
                continue;
            }

            String legacyValue = legacy.getString(key, null);
            if (legacyValue == null || legacyValue.trim().isEmpty()) {
                continue;
            }

            secure.edit().putString(key, legacyValue).apply();
            legacyEditor.remove(key);
            changed = true;
        }

        if (changed) {
            legacyEditor.commit();
        }
    }
}
