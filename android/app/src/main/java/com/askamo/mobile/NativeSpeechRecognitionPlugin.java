package com.askamo.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "NativeSpeechRecognition")
public class NativeSpeechRecognitionPlugin extends Plugin {
    private static final String TAG = "NativeSpeechRecog";
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private boolean isSupported = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
        isSupported = SpeechRecognizer.isRecognitionAvailable(getContext());
        Log.d(TAG, "Speech recognition available: " + isSupported);
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", isSupported);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!isSupported) {
            call.reject("Speech recognition is not available on this device");
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission denied");
            return;
        }

        if (isListening) {
            call.resolve();
            return;
        }

        // Run on main thread
        mainHandler.post(() -> {
            try {
                if (speechRecognizer != null) {
                    speechRecognizer.destroy();
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                if (speechRecognizer == null) {
                    call.reject("Failed to create speech recognizer");
                    return;
                }

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        Log.d(TAG, "Ready for speech");
                        isListening = true;
                        JSObject event = new JSObject();
                        event.put("type", "ready");
                        notifyListeners("speechEvent", event);
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        Log.d(TAG, "Beginning of speech");
                        JSObject event = new JSObject();
                        event.put("type", "beginning");
                        notifyListeners("speechEvent", event);
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        JSObject event = new JSObject();
                        event.put("type", "volume");
                        event.put("level", rmsdB);
                        notifyListeners("speechEvent", event);
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {
                        Log.d(TAG, "End of speech");
                        isListening = false;
                        JSObject event = new JSObject();
                        event.put("type", "end");
                        notifyListeners("speechEvent", event);
                    }

                    @Override
                    public void onError(int error) {
                        Log.e(TAG, "Speech recognition error: " + error);
                        isListening = false;
                        String errorMsg;
                        switch (error) {
                            case SpeechRecognizer.ERROR_AUDIO:
                                errorMsg = "Audio recording error";
                                break;
                            case SpeechRecognizer.ERROR_CLIENT:
                                errorMsg = "Client side error";
                                break;
                            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                                errorMsg = "Insufficient permissions";
                                break;
                            case SpeechRecognizer.ERROR_NETWORK:
                                errorMsg = "Network error";
                                break;
                            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                                errorMsg = "Network timeout";
                                break;
                            case SpeechRecognizer.ERROR_NO_MATCH:
                                errorMsg = "No speech match";
                                break;
                            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                                errorMsg = "Recognizer busy";
                                break;
                            case SpeechRecognizer.ERROR_SERVER:
                                errorMsg = "Server error";
                                break;
                            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                                errorMsg = "Speech timeout";
                                break;
                            default:
                                errorMsg = "Unknown error: " + error;
                        }
                        JSObject event = new JSObject();
                        event.put("type", "error");
                        event.put("error", errorMsg);
                        notifyListeners("speechEvent", event);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            Log.d(TAG, "Results: " + matches.get(0));
                            JSObject event = new JSObject();
                            event.put("type", "result");
                            event.put("text", matches.get(0));
                            event.put("isFinal", true);
                            notifyListeners("speechEvent", event);
                        }
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            JSObject event = new JSObject();
                            event.put("type", "result");
                            event.put("text", matches.get(0));
                            event.put("isFinal", false);
                            notifyListeners("speechEvent", event);
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

                speechRecognizer.startListening(intent);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Failed to start speech recognition", e);
                isListening = false;
                call.reject("Failed to start: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainHandler.post(() -> {
            if (speechRecognizer != null && isListening) {
                try {
                    speechRecognizer.stopListening();
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping speech recognition", e);
                }
            }
            isListening = false;
        });
        call.resolve();
    }

    @PluginMethod
    public void abort(PluginCall call) {
        mainHandler.post(() -> {
            if (speechRecognizer != null) {
                try {
                    speechRecognizer.cancel();
                    speechRecognizer.destroy();
                    speechRecognizer = null;
                } catch (Exception e) {
                    Log.e(TAG, "Error aborting speech recognition", e);
                }
            }
            isListening = false;
        });
        call.resolve();
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("listening", isListening);
        call.resolve(ret);
    }
}
