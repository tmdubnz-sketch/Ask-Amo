package com.askamo.mobile;

import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "NativeTts")
public class NativeTtsPlugin extends Plugin {
    private static final String[] PREFERRED_VOICE_NAMES = new String[] {
        "en-us-x-iom-local",
        "en-us-x-iob-local",
        "en-us-x-tpd-local",
        "en-us-x-sfg-local",
        "en-us-x-iog-local",
        "en-us-x-tpc-local",
        "en-au-x-aub-local"
    };

    private TextToSpeech textToSpeech;
    private boolean isReady = false;
    private String initError = null;
    private Locale currentLocale = Locale.forLanguageTag("en-NZ");
    private String activeVoiceName = null;

    @Override
    public void load() {
        initializeTextToSpeech();
    }

    @Override
    protected void handleOnDestroy() {
        shutdownTextToSpeech();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isReady);
        result.put("language", currentLocale.toLanguageTag());
        result.put("voiceName", activeVoiceName);
        result.put("availableVoices", buildVoicesArray());
        result.put("message", isReady ? "Native TTS is ready." : (initError != null ? initError : "Native TTS is starting."));
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        float rate = getFloat(call, "rate", 0.90f);
        float pitch = getFloat(call, "pitch", 0.48f);
        String languageTag = call.getString("language", "en-NZ");
        String requestedVoiceName = call.getString("voiceName");

        if (text == null || text.trim().isEmpty()) {
          call.reject("text is required");
          return;
        }

        if (!isReady || textToSpeech == null) {
          call.reject(initError != null ? initError : "Native TTS is not ready yet.");
          return;
        }

        Locale requestedLocale = Locale.forLanguageTag(languageTag);
        int availability = textToSpeech.isLanguageAvailable(requestedLocale);
        if (availability >= TextToSpeech.LANG_AVAILABLE) {
            currentLocale = requestedLocale;
            textToSpeech.setLanguage(requestedLocale);
            if (!selectVoiceByName(requestedVoiceName, requestedLocale)) {
                selectPreferredVoiceForLocale(requestedLocale);
            }
        } else if (!selectVoiceByName(requestedVoiceName, currentLocale)) {
            selectPreferredVoiceForLocale(currentLocale);
        }

        textToSpeech.setSpeechRate(rate);
        textToSpeech.setPitch(pitch);

        String utteranceId = UUID.randomUUID().toString();
        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId);
        if (result != TextToSpeech.SUCCESS) {
            call.reject("Native TTS failed to queue speech.");
            return;
        }

        JSObject response = new JSObject();
        response.put("queued", true);
        response.put("utteranceId", utteranceId);
        response.put("language", currentLocale.toLanguageTag());
        response.put("voiceName", activeVoiceName);
        call.resolve(response);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        call.resolve();
    }

    private void initializeTextToSpeech() {
        if (textToSpeech != null) {
            return;
        }

        textToSpeech = new TextToSpeech(getContext(), status -> {
            if (status != TextToSpeech.SUCCESS) {
                isReady = false;
                initError = "Android TextToSpeech failed to initialize on this device.";
                return;
            }

            Locale[] preferredLocales = new Locale[] {
                Locale.forLanguageTag("en-NZ"),
                Locale.forLanguageTag("en-AU"),
                Locale.forLanguageTag("en-US")
            };

            for (Locale candidateLocale : preferredLocales) {
                int availability = textToSpeech.isLanguageAvailable(candidateLocale);
                if (availability >= TextToSpeech.LANG_AVAILABLE) {
                    currentLocale = candidateLocale;
                    textToSpeech.setLanguage(candidateLocale);
                    selectPreferredVoiceForLocale(candidateLocale);
                    break;
                }
            }

            textToSpeech.setSpeechRate(0.90f);
            textToSpeech.setPitch(0.48f);
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                }

                @Override
                public void onDone(String utteranceId) {
                }

                @Override
                public void onError(String utteranceId) {
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                }

                @Override
                public void onStop(String utteranceId, boolean interrupted) {
                }

                @Override
                public void onBeginSynthesis(String utteranceId, int sampleRateInHz, int audioFormat, int channelCount) {
                }

                @Override
                public void onAudioAvailable(String utteranceId, byte[] audio) {
                }

                @Override
                public void onRangeStart(String utteranceId, int start, int end, int frame) {
                }
            });

            isReady = true;
            initError = null;
        });
    }

    private void shutdownTextToSpeech() {
        isReady = false;
        activeVoiceName = null;
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
    }

    private float getFloat(PluginCall call, String key, float fallback) {
        Double value = call.getDouble(key);
        if (value == null) {
            return fallback;
        }
        return value.floatValue();
    }

    private void selectPreferredVoiceForLocale(Locale locale) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || textToSpeech == null) {
            activeVoiceName = null;
            return;
        }

        Set<Voice> availableVoices = textToSpeech.getVoices();
        if (availableVoices == null || availableVoices.isEmpty()) {
            Voice currentVoice = textToSpeech.getVoice();
            activeVoiceName = currentVoice != null ? currentVoice.getName() : null;
            return;
        }

        Voice bestVoice = null;
        int bestScore = Integer.MIN_VALUE;

        for (Voice voice : availableVoices) {
            Locale voiceLocale = voice.getLocale();
            if (voiceLocale == null || !voiceLocale.getLanguage().equalsIgnoreCase(locale.getLanguage())) {
                continue;
            }

            int score = scoreVoice(voice);
            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        }

        if (bestVoice != null) {
            textToSpeech.setVoice(bestVoice);
            activeVoiceName = bestVoice.getName();
            return;
        }

        Voice currentVoice = textToSpeech.getVoice();
        activeVoiceName = currentVoice != null ? currentVoice.getName() : null;
    }

    private int scoreVoice(Voice voice) {
        String name = voice.getName() != null ? voice.getName().toLowerCase(Locale.ROOT) : "";
        String locale = voice.getLocale() != null ? voice.getLocale().toLanguageTag().toLowerCase(Locale.ROOT) : "";
        int score = 0;

        for (int index = 0; index < PREFERRED_VOICE_NAMES.length; index += 1) {
            if (name.equals(PREFERRED_VOICE_NAMES[index])) {
                score += 220 - index * 18;
                break;
            }
        }

        if (locale.contains("en-nz")) score += 80;
        else if (locale.contains("en-us")) score += 46;
        else if (locale.contains("en-au")) score += 24;
        else if (locale.contains("en-gb")) score -= 90;
        else score -= 120;

        if (name.contains("male") || name.contains("man") || name.contains("guy")) score += 34;
        if (name.contains("daniel")) score += 34;
        if (name.contains("lee")) score += 26;
        if (name.contains("gordon")) score += 26;
        if (name.contains("natural") || name.contains("neural") || name.contains("studio")) score += 20;
        if (name.contains("deep") || name.contains("bass")) score += 8;
        if (name.contains("robot") || name.contains("wave")) score -= 16;
        if (name.contains("gbd") || name.contains("male_1") || name.contains("male_2")) score += 40;
        if (voice.getQuality() >= Voice.QUALITY_VERY_HIGH) score += 18;
        else if (voice.getQuality() >= Voice.QUALITY_HIGH) score += 10;
        if (voice.getLatency() <= Voice.LATENCY_NORMAL) score += 8;
        if (!voice.isNetworkConnectionRequired()) score += 6;

        if (name.contains("female") || name.contains("woman") || name.contains("girl")) score -= 44;
        if (name.contains("child")) score -= 24;

        return score;
    }

    private boolean selectVoiceByName(String requestedVoiceName, Locale requestedLocale) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || textToSpeech == null || requestedVoiceName == null || requestedVoiceName.trim().isEmpty()) {
            return false;
        }

        Set<Voice> availableVoices = textToSpeech.getVoices();
        if (availableVoices == null || availableVoices.isEmpty()) {
            return false;
        }

        for (Voice voice : availableVoices) {
            if (voice.getName() != null && voice.getName().equals(requestedVoiceName)) {
                Locale voiceLocale = voice.getLocale();
                if (!isPreferredVoiceLocale(voiceLocale, requestedLocale)) {
                    continue;
                }

                if (textToSpeech.setVoice(voice) == TextToSpeech.SUCCESS) {
                    activeVoiceName = voice.getName();
                    return true;
                }
            }
        }

        return false;
    }

    private boolean isPreferredVoiceLocale(Locale voiceLocale, Locale requestedLocale) {
        if (voiceLocale == null || requestedLocale == null) {
            return false;
        }

        if (!voiceLocale.getLanguage().equalsIgnoreCase(requestedLocale.getLanguage())) {
            return false;
        }

        return true;
    }

    private JSArray buildVoicesArray() {
        JSArray voicesArray = new JSArray();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || textToSpeech == null) {
            return voicesArray;
        }

        Set<Voice> availableVoices = textToSpeech.getVoices();
        if (availableVoices == null) {
            return voicesArray;
        }

        for (Voice voice : availableVoices) {
            Locale voiceLocale = voice.getLocale();
            if (!isPreferredVoiceLocale(voiceLocale, Locale.forLanguageTag("en-NZ"))) {
                continue;
            }

            JSObject voiceObject = new JSObject();
            voiceObject.put("name", voice.getName());
            voiceObject.put("locale", voiceLocale != null ? voiceLocale.toLanguageTag() : "");
            voiceObject.put("quality", voice.getQuality());
            voiceObject.put("latency", voice.getLatency());
            voiceObject.put("networkConnectionRequired", voice.isNetworkConnectionRequired());
            voiceObject.put("installed", !voice.isNetworkConnectionRequired());
            voicesArray.put(voiceObject);
        }

        return voicesArray;
    }
}
