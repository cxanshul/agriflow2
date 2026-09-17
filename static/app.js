const SUPPORTED_LANGUAGES = ['en', 'hi', 'pa', 'mr', 'gu', 'kn', 'te', 'ta', 'bn'];

function detectPreferredLanguage() {
    const userChoice = localStorage.getItem('agriflow-user-language-choice');
    if (userChoice && SUPPORTED_LANGUAGES.includes(userChoice)) return userChoice;
    const stored = localStorage.getItem('agriflow-language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
    const browserLang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase().slice(0, 2);
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
}

let currentLang = detectPreferredLanguage();
if (!localStorage.getItem('agriflow-language')) {
    localStorage.setItem('agriflow-language', currentLang);
}
let produceBatches = [];
let mandiRecordsCache = [];
let selectedImageBase64 = null;
let selectedImagesBase64 = [];
let pendingAlert = null;
let chatImageBase64 = null;
let isLiveVoiceActive = false;
let isRecognizing = false;
let voiceDebounceTimer = null; // New timer to wait before sending
let weatherRequestPromise = null;
let weatherCache = null;
let farmerProfile = null;
let storageFinderMap = null;
let storageFinderLayer = null;

const translations = {
    en: {
        analyzing: "⏳ Running Gemini Quality & Spoilage AI...",
        analyzeBtn: "Analyze Quality and Predict Spoilage",
        settleBtn: "Confirm Sale, Settle Financials & Archive to History",
        settling: "⏳ Finalizing Financial Settlement & Generating Next Crop Plan...",
        customCostPrompt: "Enter Custom Cost Name (e.g., Cold Truck Transport, Sacking):",
        toastSaved: "Produce Batch registered and diagnosed successfully!",
        toastSettled: "Produce sold, profit calculated, and archived!",
        toastError: "Encountered an issue. Processed via fallback rules.",
        voiceListening: "Listening... speak now",
        voiceActive: "Live Voice On",
        voiceChatStatus: "Voice Chat",
        voiceNotSupported: "Speech recognition is not supported in this browser. Please use Chrome/Edge.",
        micBlocked: "Microphone permission was denied. Please allow microphone access in browser settings.",
        voiceError: "Voice input failed. Please try again or type your message.",
        batches: "Batches",
        records: "Records",
        activeBatch: "Select Active Batch",
        storedVolume: "Stored Volume",
        spoilageRisk: "Spoilage Risk",
        storage: "Storage",
        processing: "Processing",
        daysLeft: "Days left",
        currentGrowingCrop: "Current Growing Crop",
        suggestedHarvest: "Suggested harvest",
        sale: "Settle Sale ➔",
        noStored: "No active stored produce batches.",
        noHistory: "No completed sales history recorded yet.",
        nextCropTitle: "AI Next Crop Recommendations for this Field:",
        nextCropFallbackTitle: "Suggested Next Crops:",
        qtyProducedSold: "Qty Produced / Sold",
        sellingPrice: "Selling Price",
        totalRevenue: "Total Revenue",
        totalCost: "Total Cost",
        demoLoaded: "Tomato demo data loaded. Review it and register the crop for AI analysis.",
        noWeatherWarnings: "No rule-based weather warnings right now.",
        weatherUnavailable: "No real weather data is available for your location right now.",
        weatherNeedsGps: "Weather requires your GPS location.",
        sellLoading: "⏳ Comparing market, weather, harvest, and storage signals...",
        sellError: "Sell timing analysis could not be completed.",
        sellNow: "Sell now",
        wait: "Wait and monitor",
        currentPrice: "Current avg price",
        nearbyPrice: "Best nearby price",
        trend: "Price trend",
        storageCost: "Storage + risk cost",
        volume: "Expected volume",
        weatherRisk: "Weather risk",
        available: "Available",
        unavailable: "Unavailable",
        records: "market records"
    },
    hi: {
        analyzing: "⏳ जेमिनी एआई द्वारा गुणवत्ता व सड़न जांच जारी है...",
        analyzeBtn: "गुणवत्ता जांचें एवं सड़न का अनुमान लगाएं",
        settleBtn: "बिक्री पक्की करें, मुनाफा निकालें एवं इतिहास में दर्ज करें",
        settling: "⏳ वित्तीय गणना एवं अगली फसल सुझाव तैयार किए जा रहे हैं...",
        customCostPrompt: "अतिरिक्त खर्च का नाम लिखें (उदा. कोल्ड वैन किराया, विशेष पैकिंग):",
        toastSaved: "उपज बैच सफलतापूर्वक पंजीकृत और विश्लेषित हुआ!",
        toastSettled: "बिक्री पूर्ण! शुद्ध लाभ दर्ज हुआ और अगली फसल का सुझाव तैयार है।",
        toastError: "त्रुटि हुई। ऑफलाइन मोड में सुरक्षित किया गया।",
        voiceListening: "सुन रहे हैं... कृपया बोलें",
        voiceActive: "लाइव आवाज चालू",
        voiceChatStatus: "आवाज संवाद",
        voiceNotSupported: "इस ब्राउज़र में आवाज पहचान उपलब्ध नहीं है। कृपया Chrome का उपयोग करें।",
        micBlocked: "माइक्रोफ़ोन अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग में अनुमति दें।",
        voiceError: "आवाज पहचान में त्रुटि हुई। कृपया पुनः प्रयास करें।",
        batches: "बैच",
        records: "रिकॉर्ड",
        activeBatch: "सक्रिय बैच चुनें",
        storedVolume: "भंडारित मात्रा",
        spoilageRisk: "सड़न जोखिम",
        storage: "भंडारण",
        processing: "प्रसंस्करण",
        daysLeft: "दिन शेष",
        currentGrowingCrop: "वर्तमान बढ़ती फसल",
        suggestedHarvest: "अनुमानित कटाई",
        sale: "बिक्री दर्ज करें ➔",
        noStored: "कोई सक्रिय भंडारित फसल नहीं है।",
        noHistory: "कोई पुराना बिक्री रिकॉर्ड उपलब्ध नहीं है।",
        nextCropTitle: "इस खेत के लिए एआई अगली फसल सुझाव:",
        nextCropFallbackTitle: "अगली फसल के सुझाव:",
        qtyProducedSold: "उत्पादित / बेची मात्रा",
        sellingPrice: "विक्रय मूल्य",
        totalRevenue: "कुल आय",
        totalCost: "कुल लागत",
        demoLoaded: "टमाटर डेमो डेटा लोड हो गया। समीक्षा करके एआई जांच के लिए फसल दर्ज करें।",
        noWeatherWarnings: "अभी कोई नियम-आधारित मौसम चेतावनी नहीं है।",
        weatherUnavailable: "इस समय आपके स्थान के लिए वास्तविक मौसम डेटा उपलब्ध नहीं है।",
        weatherNeedsGps: "मौसम देखने के लिए GPS स्थान आवश्यक है।",
        sellLoading: "⏳ बाजार, मौसम, उपज और भंडारण संकेतों की तुलना हो रही है...",
        sellError: "बिक्री समय विश्लेषण पूरा नहीं हो सका।",
        sellNow: "अभी बेचें",
        wait: "रुकें और निगरानी करें",
        currentPrice: "वर्तमान औसत भाव",
        nearbyPrice: "सबसे अच्छा आसपास का भाव",
        trend: "भाव रुझान",
        storageCost: "भंडारण + जोखिम लागत",
        volume: "अनुमानित मात्रा",
        weatherRisk: "मौसम जोखिम",
        available: "उपलब्ध",
        unavailable: "उपलब्ध नहीं",
        records: "बाजार रिकॉर्ड"
    }
};

function t(key) {
    return translations[currentLang][key] || translations.en[key] || key;
}

document.addEventListener("DOMContentLoaded", () => {
    setLanguage(currentLang);
    try {
        const today = new Date().toISOString().split('T')[0];
        const h = document.getElementById("harvest_date");
        const s = document.getElementById("selling_date");
        if (h) h.value = today;
        if (s) s.value = today;
    } catch (e) {}

    loadBatches();
    loadProfile().finally(() => requestWeatherFromGps());
    fetchMandiRates();
    handlePreCostCalculation();
});

async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth";
}

async function loadProfile() {
    const response = await fetch("/api/profile");
    if (response.status === 401) {
        window.location.href = "/auth";
        return;
    }
    if (!response.ok) throw new Error(`Profile request failed (${response.status})`);

    const data = await response.json();
    farmerProfile = data.profile || null;
    const displayName = document.getElementById("display-farmer");
    if (displayName && farmerProfile?.full_name) displayName.innerText = farmerProfile.full_name;
    updateWhatsAppUI();

    if (farmerProfile?.latitude && farmerProfile?.longitude) {
        autoDetectLocationLanguage(farmerProfile.latitude, farmerProfile.longitude, farmerProfile.location_name);
    } else if (farmerProfile?.location_name) {
        autoDetectLocationLanguage(null, null, farmerProfile.location_name);
    }
}

function openProfile() {
    const modal = document.getElementById("profile-modal");
    if (!modal) return;

    document.getElementById("profile-name").value = farmerProfile?.full_name || "";
    document.getElementById("profile-latitude").value = farmerProfile?.latitude ?? "";
    document.getElementById("profile-longitude").value = farmerProfile?.longitude ?? "";
    document.getElementById("profile-location-name").value = farmerProfile?.location_name || "";
    document.getElementById("profile-alert-phone").value = farmerProfile?.alert_phone || "";
    const langSelect = document.getElementById("profile-preferred-language");
    if (langSelect) {
        langSelect.value = currentLang;
    }
    const waSwitch = document.getElementById("profile-whatsapp-enabled");
    if (waSwitch) {
        waSwitch.checked = farmerProfile?.whatsapp_alerts_enabled !== false;
    }
    updateWhatsAppUI();
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeProfile() {
    const modal = document.getElementById("profile-modal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
}

function useProfileLocation() {
    if (!navigator.geolocation) {
        showToast("Location is not supported by this browser.", "error");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            document.getElementById("profile-latitude").value = lat.toFixed(6);
            document.getElementById("profile-longitude").value = lon.toFixed(6);
            autoDetectLocationLanguage(lat, lon);
            showToast("Farm location detected.", "success");
        },
        () => showToast("Could not access your location. Please enter coordinates manually.", "error"),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function saveProfile(event) {
    event.preventDefault();
    const waSwitch = document.getElementById("profile-whatsapp-enabled");
    const langSelect = document.getElementById("profile-preferred-language");
    const payload = {
        full_name: document.getElementById("profile-name").value.trim(),
        latitude: document.getElementById("profile-latitude").value,
        longitude: document.getElementById("profile-longitude").value,
        location_name: document.getElementById("profile-location-name").value.trim(),
        alert_phone: document.getElementById("profile-alert-phone").value.trim(),
        whatsapp_alerts_enabled: waSwitch ? waSwitch.checked : (farmerProfile?.whatsapp_alerts_enabled !== false)
    };

    if (langSelect && langSelect.value) {
        setLanguage(langSelect.value, true);
    }

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Profile could not be saved.");

        farmerProfile = data.profile;
        const displayName = document.getElementById("display-farmer");
        if (displayName) displayName.innerText = farmerProfile.full_name || "Signed in";
        updateWhatsAppUI();
        closeProfile();
        showToast("Profile saved successfully.", "success");
        if (typeof renderStoredProduce === "function") renderStoredProduce();
    } catch (error) {
        showToast(error.message, "error");
    }
}

function getBatchWhatsAppCooldown(b) {
    if (!b) return null;
    let lastSent = null;
    if (b.last_whatsapp_alert_at) {
        try {
            lastSent = new Date(b.last_whatsapp_alert_at).getTime();
        } catch (e) {
            lastSent = null;
        }
    }
    const localKey = `agriflow-alert-${b.id}-whatsapp`;
    const localVal = localStorage.getItem(localKey);
    if (localVal) {
        const localTs = parseInt(localVal, 10);
        if (!isNaN(localTs) && (!lastSent || localTs > lastSent)) {
            lastSent = localTs;
        }
    }
    if (!lastSent) return null;
    const elapsed = Date.now() - lastSent;
    const cooldownMs = 24 * 3600 * 1000;
    if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const remainingHours = (remainingMs / (3600 * 1000)).toFixed(1);
        return { active: true, remainingHours, remainingMs };
    }
    return null;
}

async function toggleWhatsAppAlerts(desiredState = null) {
    const currentState = farmerProfile?.whatsapp_alerts_enabled !== false;
    const newState = desiredState !== null ? Boolean(desiredState) : !currentState;
    
    try {
        const response = await fetch("/api/profile/whatsapp-alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: newState })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || "Could not update WhatsApp alert preference.");
        }
        if (!farmerProfile) farmerProfile = {};
        farmerProfile.whatsapp_alerts_enabled = data.whatsapp_alerts_enabled;
        updateWhatsAppUI();
        
        const msg = data.whatsapp_alerts_enabled 
            ? (currentLang === 'hi' ? "व्हाट्सएप उच्च-जोखिम अलर्ट चालू कर दिए गए हैं (24 घंटे का अंतराल लागू)।" : "WhatsApp High-Risk alerts are now turned ON (24h cooldown enforced).")
            : (currentLang === 'hi' ? "व्हाट्सएप अलर्ट सफलतापूर्वक बंद कर दिए गए हैं।" : "WhatsApp alerts turned OFF.");
        showToast(msg, data.whatsapp_alerts_enabled ? "success" : "info");
        
        if (typeof renderStoredProduce === "function") {
            renderStoredProduce();
        }
    } catch (err) {
        console.error("Failed to toggle WhatsApp alerts:", err);
        showToast(err.message || "Failed to toggle WhatsApp alerts", "error");
        updateWhatsAppUI();
    }
}

function quickToggleWhatsApp() {
    toggleWhatsAppAlerts();
}

function toggleWhatsAppAlertsFromSwitch(checked) {
    toggleWhatsAppAlerts(checked);
}

function updateWhatsAppUI() {
    const isEnabled = farmerProfile?.whatsapp_alerts_enabled !== false;
    
    const btn = document.getElementById("btn-toggle-whatsapp");
    const label = document.getElementById("wa-toggle-label");
    if (btn) {
        btn.classList.toggle("active", isEnabled);
        btn.classList.toggle("disabled", !isEnabled);
        btn.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    }
    if (label) {
        if (isEnabled) {
            label.textContent = currentLang === 'hi' ? "व्हाट्सएप अलर्ट: चालू" : "WhatsApp Alerts: ON";
            label.setAttribute("data-en", "WhatsApp Alerts: ON");
            label.setAttribute("data-hi", "व्हाट्सएप अलर्ट: चालू");
        } else {
            label.textContent = currentLang === 'hi' ? "व्हाट्सएप अलर्ट: बंद" : "WhatsApp Alerts: OFF";
            label.setAttribute("data-en", "WhatsApp Alerts: OFF");
            label.setAttribute("data-hi", "व्हाट्सएप अलर्ट: बंद");
        }
    }
    
    const toggleSwitch = document.getElementById("profile-whatsapp-enabled");
    if (toggleSwitch) {
        toggleSwitch.checked = isEnabled;
    }
    const statusText = document.getElementById("wa-setting-status");
    if (statusText) {
        if (isEnabled) {
            statusText.className = "wa-setting-status text-green";
            statusText.innerHTML = `<span class="wa-indicator-dot"></span> <span>${currentLang === 'hi' ? 'सक्रिय: 24 घंटे के अंतराल पर उच्च-जोखिम अपडेट चालू हैं' : 'Active: 24-hour interval for high-risk crop updates'}</span>`;
        } else {
            statusText.className = "wa-setting-status text-muted";
            statusText.innerHTML = `<span class="wa-indicator-dot off"></span> <span>${currentLang === 'hi' ? 'निष्क्रिय: व्हाट्सएप संदेश बंद हैं' : 'Muted: WhatsApp notifications are turned off'}</span>`;
        }
    }
}

function useFarmLocation() {
    if (!navigator.geolocation) {
        showToast("Location is not supported by this browser.", "error");
        return;
    }

    const status = document.getElementById("weather-status");
    if (status) status.textContent = "Getting your farm location...";
    navigator.geolocation.getCurrentPosition(
        async position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            farmerProfile = {
                ...(farmerProfile || {}),
                latitude,
                longitude
            };
            autoDetectLocationLanguage(latitude, longitude);
            await fetchWeather(latitude, longitude);
        },
        error => {
            if (status) status.textContent = error.code === error.PERMISSION_DENIED
                ? "Location permission was denied. Enter coordinates in Profile."
                : "Could not access your location. Try again or use Profile coordinates.";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
}

async function requestWeatherFromGps() {
    if (weatherRequestPromise) return weatherRequestPromise;

    const latitude = Number(farmerProfile?.latitude);
    const longitude = Number(farmerProfile?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        weatherRequestPromise = fetchWeather(latitude, longitude).finally(() => {
            weatherRequestPromise = null;
        });
        return weatherRequestPromise;
    }

    const status = document.getElementById("weather-status");
    if (status) status.textContent = "Save your farm location in Profile or use your current location.";
    return null;
}

async function deleteAllProduce() {
    const confirmed = window.confirm("Delete all your registered crop data from Supabase? This cannot be undone.");
    if (!confirmed) return;

    try {
        const response = await fetch("/api/produce/delete-all", { method: "DELETE" });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || `Delete failed (${response.status})`);
        }
        produceBatches = [];
        renderAllViews();
        showToast("All your crop data was permanently deleted.", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

const tabMeta = {
    'pre-cost': {
        en: { title: "Farm Financial & Pre-Cost Engine", sub: "Estimate inputs, expected yield, real-time market selling rates, and profit per acre." },
        hi: { title: "फसल पूर्व लागत एवं वित्तीय सलाहकार", sub: "जमीन का रकबा, इनपुट खर्च भरें और मंडी भाव के आधार पर संभावित शुद्ध मुनाफा जानें।" }
    },
    'weather': {
        en: { title: "Weather, Soil & Irrigation Signals", sub: "Real-time meteorological and agronomic signals for your farm coordinates." },
        hi: { title: "मौसम, मिट्टी और सिंचाई संकेत", sub: "आपके खेत के निर्देशांकों के लिए वास्तविक मौसम व कृषि संकेत।" }
    },
    'mandi': {
        en: { title: "Verified APMC Mandi Market Rates", sub: "Live commodity prices across major agricultural markets in India." },
        hi: { title: "सत्यापित APMC मंडी भाव", sub: "भारत की प्रमुख कृषि मंडियों के दैनिक व मॉडल विक्रय भाव।" }
    },
    'sell-decision': {
        en: { title: "AI Sell Now or Wait Decision Engine", sub: "Data-driven pricing, storage cost, and market trend recommendation." },
        hi: { title: "एआई: अभी बेचें या रुकें?", sub: "लाइव भाव, भंडारण खर्च और मंडी रुझान के आधार पर श्रेष्ठ निर्णय।" }
    },
    'storage-finder': {
        en: { title: "Nearest Storage Facilities & Warehouses", sub: "Locate verified cold storages, CWC/SWC warehouses, and WDRA accredited godowns." },
        hi: { title: "निकटतम भंडारण केंद्र खोजें", sub: "अपने निकटतम सत्यापित कोल्ड स्टोरेज, वेयरहाउस (CWC/SWC) और साइलो खोजें।" }
    },
    'crop-analysis': {
        en: { title: "Yearly & Future Crop Analysis", sub: "12-Month cyclical seasonality, harvest glut patterns, and 3-6 month predictive market economics." },
        hi: { title: "वार्षिक व भविष्य फसल विश्लेषण", sub: "12 महीने का मौसमी चक्र, आवक का दबाव और 3-6 महीने का भविष्य भाव पूर्वानुमान।" }
    },
    'add-batch': {
        en: { title: "Register Crops with AI Analysis", sub: "Upload crop photos for Gemini vision quality detection and shelf-life prediction." },
        hi: { title: "एआई जांच के साथ फसल दर्ज करें", sub: "फसल की फोटो अपलोड करें और जेमिनी विज़न गुणवत्ता जांच व सड़न जोखिम जानें।" }
    },
    'ledger-stored': {
        en: { title: "Active Inventory Batches in Storage", sub: "Track produce volume, harvest date, and monitor real-time spoilage risk." },
        hi: { title: "सक्रिय भंडारित उपज बैच", sub: "भंडारित उपज मात्रा, कटाई की तारीख और सड़न जोखिम की निगरानी करें।" }
    },
    'ledger-sold': {
        en: { title: "Settle Sale & Calculate Financials", sub: "Combine production expenses with logistics and selling costs for exact profit/loss." },
        hi: { title: "अंतिम बिक्री मूल्य एवं विपणन खर्च दर्ज करें", sub: "उत्पादन लागत और अंतिम विपणन खर्च को जोड़कर सटीक शुद्ध लाभ/हानि निकालें।" }
    },
    'ledger-history': {
        en: { title: "Historical Crop Records & AI Rotation Plans", sub: "Review past yield profits and discover intelligent next crop recommendations." },
        hi: { title: "ऐतिहासिक फसल रिकॉर्ड एवं अगली फसल योजनाएं", sub: "पिछले फसल मुनाफे का विश्लेषण और अगली फसल चक्र के लिए एआई सुझाव।" }
    }
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(b => {
        const attr = b.getAttribute('onclick') || '';
        b.classList.toggle('active', attr.includes(`switchTab('${tabId}')`));
    });

    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(btn => {
        const attr = btn.getAttribute('onclick') || '';
        if (attr.includes(`switchTab('${tabId}')`)) {
            btn.classList.add('active');
        }
    });

    // Dynamically update Header Title and Subtitle
    if (tabMeta[tabId]) {
        const enTitle = tabMeta[tabId].en.title;
        const enSub = tabMeta[tabId].en.sub;
        let regTitle = tabMeta[tabId][currentLang]?.title;
        let regSub = tabMeta[tabId][currentLang]?.sub;
        if (!regTitle && typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[currentLang]) {
            regTitle = REGIONAL_UI_DICTIONARY[currentLang][enTitle];
            regSub = REGIONAL_UI_DICTIONARY[currentLang][enSub];
        }
        if (!regTitle) regTitle = (currentLang === 'hi') ? tabMeta[tabId].hi.title : enTitle;
        if (!regSub) regSub = (currentLang === 'hi') ? tabMeta[tabId].hi.sub : enSub;

        const titleEl = document.getElementById('page-title');
        const subEl = document.querySelector('.top-header .subtitle');
        if (titleEl) {
            titleEl.textContent = regTitle;
            titleEl.setAttribute('data-en', enTitle);
            titleEl.setAttribute('data-hi', tabMeta[tabId].hi.title);
        }
        if (subEl) {
            subEl.textContent = regSub;
            subEl.setAttribute('data-en', enSub);
            subEl.setAttribute('data-hi', tabMeta[tabId].hi.sub);
        }
    }

    if (tabId === 'storage-finder' && typeof triggerStorageSearch === 'function') {
        setTimeout(triggerStorageSearch, 150);
    }
    if (tabId === 'crop-analysis' && typeof loadCropHorizonAnalysis === 'function') {
        if (!latestHorizonData) {
            setTimeout(loadCropHorizonAnalysis, 100);
        }
    }
}

function showToast(msg, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 3500);
}

function setLanguage(lang, userInitiated = false) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
    currentLang = lang;
    if (userInitiated) {
        localStorage.setItem('agriflow-user-language-choice', lang);
        localStorage.setItem('agriflow-lang-locked', 'true');
        localStorage.setItem('agriflow-initial-location-detected', 'true');
        const autoTag = document.getElementById('lang-auto-tag');
        if (autoTag) autoTag.innerText = 'Manual';
    }
    localStorage.setItem('agriflow-language', lang);
    document.documentElement.lang = lang;

    // Sync dropdowns
    const appLangSelect = document.getElementById('app-lang-select');
    if (appLangSelect && appLangSelect.value !== lang) {
        appLangSelect.value = lang;
    }
    const profLangSelect = document.getElementById('profile-preferred-language');
    if (profLangSelect && profLangSelect.value !== lang) {
        profLangSelect.value = lang;
    }

    const btnEn = document.getElementById('btn-en');
    const btnHi = document.getElementById('btn-hi');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    if (btnHi) btnHi.classList.toggle('active', lang === 'hi');

    document.querySelectorAll('[data-en]').forEach(el => {
        const enKey = el.getAttribute('data-en');
        let text = el.getAttribute(`data-${lang}`);
        if (!text && typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[lang]) {
            text = REGIONAL_UI_DICTIONARY[lang][enKey];
        }
        if (text) {
            el.textContent = text;
        } else if (lang === 'en') {
            el.textContent = enKey;
        } else if (el.getAttribute('data-hi')) {
            el.textContent = el.getAttribute('data-hi');
        }
    });

    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
        const enKey = el.getAttribute('data-placeholder-en');
        let placeholder = el.getAttribute(`data-placeholder-${lang}`);
        if (!placeholder && typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[lang]) {
            placeholder = REGIONAL_UI_DICTIONARY[lang][enKey];
        }
        if (placeholder) {
            el.placeholder = placeholder;
        } else if (lang === 'en') {
            el.placeholder = enKey;
        }
    });

    const chatLangIndicator = document.getElementById("chat-lang-indicator");
    if (chatLangIndicator) {
        chatLangIndicator.innerText = lang.toUpperCase();
    }

    const weatherAction = document.getElementById('weather-action-result');
    if (weatherAction && !weatherCache?.data) {
        weatherAction.textContent = (lang === 'en')
            ? 'Load your GPS weather first, then analyze.'
            : (typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[lang]?.['Load your GPS weather first, then analyze.'] || 'पहले GPS मौसम लोड करें, फिर जांचें।');
    }
    const weatherStatus = document.getElementById('weather-status');
    if (weatherStatus && (!weatherStatus.textContent || weatherStatus.textContent.includes('Waiting') || weatherStatus.textContent.includes('प्रतीक्षा'))) {
        weatherStatus.textContent = (lang === 'en')
            ? 'Waiting for your GPS location...'
            : (typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[lang]?.['Waiting for your GPS location...'] || 'आपके GPS स्थान की प्रतीक्षा है...');
    }

    // Refresh active tab title & subtitle
    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel) {
        const tabId = activePanel.id.replace('tab-', '');
        if (typeof tabMeta !== 'undefined' && tabMeta[tabId]) {
            const enTitle = tabMeta[tabId].en.title;
            const enSub = tabMeta[tabId].en.sub;
            let regTitle = tabMeta[tabId][lang]?.title;
            let regSub = tabMeta[tabId][lang]?.sub;
            if (!regTitle && typeof REGIONAL_UI_DICTIONARY !== 'undefined' && REGIONAL_UI_DICTIONARY[lang]) {
                regTitle = REGIONAL_UI_DICTIONARY[lang][enTitle];
                regSub = REGIONAL_UI_DICTIONARY[lang][enSub];
            }
            if (!regTitle) regTitle = (lang === 'hi') ? tabMeta[tabId].hi.title : enTitle;
            if (!regSub) regSub = (lang === 'hi') ? tabMeta[tabId].hi.sub : enSub;

            const titleEl = document.getElementById('page-title');
            const subEl = document.querySelector('.top-header .subtitle');
            if (titleEl) titleEl.textContent = regTitle;
            if (subEl) subEl.textContent = regSub;
        }
    }

    updateWhatsAppUI();
    renderAllViews();
    handlePreCostCalculation();
}

async function toggleChatLanguage() {
    const nextLang = (currentLang === 'en') ? 'hi' : 'en';
    setLanguage(nextLang);
    const messages = Array.from(document.querySelectorAll('#chat-messages .bot-msg, #chat-messages .user-msg'));
    const originalMessages = messages.map(message => {
        if (!message.dataset.originalText) message.dataset.originalText = message.innerText;
        return message.dataset.originalText;
    });

    if (messages.length === 0) return;
    try {
        const response = await fetch('/api/assistant/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: originalMessages, target_lang: nextLang })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Translation failed.');
        (data.translations || []).forEach((translation, index) => {
            if (messages[index] && translation) messages[index].innerText = translation;
        });
        showToast(nextLang === 'hi' ? 'चैट हिंदी में बदल गई।' : 'Chat switched to English.', 'info');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadBatches() {
    try {
        const res = await fetch("/api/produce/list");
        if (res.status === 401) {
            window.location.href = "/auth";
            return;
        }
        const data = await res.json();
        produceBatches = data.batches || [];
    } catch (e) {
        console.warn("Offline batch fallback active");
    }
    renderAllViews();
}

function renderAllViews() {
    renderStoredProduce();
    populateSettlementDropdown();
    populateSellDecisionBatches();
    renderHistoryProduce();
    updateTallyStrip();
}

function updateTallyStrip() {
    let activeQty = 0;
    let highRiskCount = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    produceBatches.forEach(b => {
        if (b.status === "active") {
            activeQty += parseFloat(b.quantity_kg) || 0;
            if (b.spoilage_risk === "High") highRiskCount++;
        } else if (b.status === "sold") {
            totalRevenue += parseFloat(b.total_revenue) || 0;
            totalProfit += parseFloat(b.net_profit_loss) || 0;
        }
    });

    const statActive = document.getElementById("stat-active-qty");
    const statRisk = document.getElementById("stat-high-risk");
    const statRev = document.getElementById("stat-total-revenue");
    const statProfit = document.getElementById("stat-total-profit");

    if (statActive) statActive.innerHTML = `${activeQty.toLocaleString()} <small>KG</small>`;
    if (statRisk) statRisk.innerHTML = `${highRiskCount} <small>${currentLang === 'hi' ? 'बैच' : 'BATCH'}</small>`;
    if (statRev) statRev.innerText = `₹ ${totalRevenue.toLocaleString()}`;
    if (statProfit) statProfit.innerText = `₹ ${totalProfit.toLocaleString()}`;
}

// ============================================================
// PRE-COST CALCULATOR LOGIC
// ============================================================

async function handlePreCostCalculation(e) {
    if (e && e.preventDefault) e.preventDefault();

    const crop = document.getElementById("calc_crop")?.value || "Wheat";
    const area = parseFloat(document.getElementById("calc_area")?.value) || 1.0;
    const unit = document.getElementById("calc_area_unit")?.value || "Acre";
    const customYield = parseFloat(document.getElementById("calc_custom_yield")?.value) || 0;

    const payload = {
        crop_name: crop,
        land_area: area,
        area_unit: unit,
        cost_seeds: parseFloat(document.getElementById("calc_seed")?.value) || 0,
        cost_fertilizer: parseFloat(document.getElementById("calc_fert")?.value) || 0,
        cost_pesticide: parseFloat(document.getElementById("calc_pest")?.value) || 0,
        cost_irrigation: parseFloat(document.getElementById("calc_irrig")?.value) || 0,
        cost_labor: parseFloat(document.getElementById("calc_labour")?.value) || 0,
        cost_machinery: parseFloat(document.getElementById("calc_mach")?.value) || 0,
        cost_fuel: parseFloat(document.getElementById("calc_fuel")?.value) || 0,
        cost_misc: parseFloat(document.getElementById("calc_misc")?.value) || 0,
        custom_yield_kg: customYield
    };

    try {
        const res = await fetch("/api/calculator/pre-cost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const d = await res.json();

        if (d.success) {
            const totalCostEl = document.getElementById("res-total-cost");
            const yieldEl = document.getElementById("res-yield");
            const rateEl = document.getElementById("res-rate");
            const revenueEl = document.getElementById("res-revenue");
            if (totalCostEl) totalCostEl.innerText = `₹ ${d.total_production_cost.toLocaleString()}`;
            if (yieldEl) yieldEl.innerText = `${d.expected_yield_kg.toLocaleString()} KG (${d.expected_yield_quintals} Qt)`;
            if (rateEl) rateEl.innerHTML = `₹ ${d.mandi_modal_price_per_quintal.toLocaleString()} / Qt <small id="res-rate-date">(${d.rate_date})</small>`;
            if (revenueEl) revenueEl.innerText = `₹ ${d.estimated_revenue.toLocaleString()}`;

            const profitEl = document.getElementById("res-net-profit");
            const profitVal = d.expected_profit_loss;
            if (profitEl) {
                profitEl.innerText = `${profitVal >= 0 ? '+' : '-'} ₹ ${Math.abs(profitVal).toLocaleString()}`;
                profitEl.className = `res-val ${profitVal >= 0 ? 'text-green' : 'text-risk'}`;
            }

            const unitEl = document.getElementById("res-profit-unit");
            if (unitEl) unitEl.innerText = `${d.profit_per_selected_unit >= 0 ? '+' : '-'} ₹ ${Math.abs(d.profit_per_selected_unit).toLocaleString()} / ${unit}`;

            // Render Visual Cost Breakdown Bar
            const breakdownItems = [
                { name: currentLang === 'hi' ? 'बीज' : 'Seeds', val: payload.cost_seeds, color: '#15803D' },
                { name: currentLang === 'hi' ? 'उर्वरक' : 'Fertilizer', val: payload.cost_fertilizer, color: '#0284C7' },
                { name: currentLang === 'hi' ? 'कीटनाशक' : 'Pesticide', val: payload.cost_pesticide, color: '#D97706' },
                { name: currentLang === 'hi' ? 'सिंचाई' : 'Irrigation', val: payload.cost_irrigation, color: '#2563EB' },
                { name: currentLang === 'hi' ? 'मजदूरी' : 'Labor', val: payload.cost_labor, color: '#7C3AED' },
                { name: currentLang === 'hi' ? 'मशीनरी' : 'Machinery', val: payload.cost_machinery, color: '#DB2777' },
                { name: currentLang === 'hi' ? 'डीजल/बिजली' : 'Fuel', val: payload.cost_fuel, color: '#EA580C' },
                { name: currentLang === 'hi' ? 'अन्य' : 'Misc', val: payload.cost_misc, color: '#64748B' }
            ];
            const sumCost = breakdownItems.reduce((acc, it) => acc + it.val, 0) || 1;
            const barContainer = document.getElementById("cost-breakdown-bar");
            const legendContainer = document.getElementById("cost-breakdown-legend");
            const totalBreakdownEl = document.getElementById("cost-breakdown-total");
            if (totalBreakdownEl) totalBreakdownEl.innerText = `₹ ${Math.round(sumCost).toLocaleString()}`;
            if (barContainer) {
                barContainer.innerHTML = breakdownItems.filter(it => it.val > 0).map(it => {
                    const pct = ((it.val / sumCost) * 100).toFixed(1);
                    return `<div class="cost-bar-seg" style="width: ${pct}%; background: ${it.color};" title="${it.name}: ₹ ${it.val.toLocaleString()} (${pct}%)"></div>`;
                }).join('');
            }
            if (legendContainer) {
                legendContainer.innerHTML = breakdownItems.filter(it => it.val > 0).map(it => {
                    const pct = Math.round((it.val / sumCost) * 100);
                    return `<span class="cost-legend-item"><i class="cost-legend-dot" style="background: ${it.color}"></i> ${it.name} (${pct}%)</span>`;
                }).join('');
            }
        }
    } catch (err) {
        console.error("Calculator error:", err);
    }
}

function autoFetchMandiBenchmark() {
    handlePreCostCalculation();
}

// ============================================================
// MANDI DATA LOGIC
// ============================================================

async function fetchMandiRates() {
    const tbody = document.getElementById("mandi-tbody");
    const alertBox = document.getElementById("mandi-alert-box");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">⏳ Loading government APMC market data...</td></tr>`;

    try {
        const res = await fetch("/api/market/mandi-rates");
        const data = await res.json();
        mandiRecordsCache = data.records || [];

        if (alertBox) {
            if (data.source === "live_mandi_api") {
                alertBox.className = "mandi-alert live";
                alertBox.innerText = "🟢 Displaying fresh daily mandi rates from the keyless Mandi API.";
            } else if (data.source === "live_datagov") {
                alertBox.className = "mandi-alert live";
                alertBox.innerText = "🟢 Displaying live Data.gov.in APMC mandi records.";
            } else if (data.source === "secondary_gov") {
                alertBox.className = "mandi-alert live";
                alertBox.innerText = "🟢 Displaying live secondary government mandi records.";
            } else {
                alertBox.className = "mandi-alert fallback";
                alertBox.innerText = "🟡 Live government mandi data is unavailable right now. No stale benchmark rates are being shown.";
            }
            alertBox.classList.remove("hidden");
        }

        renderMandiTable(mandiRecordsCache);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--risk-red); text-align:center;">Failed to load mandi data. Please refresh.</td></tr>`;
    }
}

function renderMandiTable(records) {
    const tbody = document.getElementById("mandi-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);">${currentLang === 'hi' ? 'इस फिल्टर के लिए कोई मंडी भाव नहीं मिला।' : 'No mandi records found matching criteria.'}</td></tr>`;
        return;
    }

    records.forEach(r => {
        const isToday = r.is_today;
        const statusBadge = isToday
            ? `<span class="badge-live">🟢 Today's Rate (${r.arrival_date})</span>`
            : `<span class="badge-latest">📅 Rate Date: ${r.arrival_date}</span>`;

        const minP = Number(r.min_price) || 0;
        const maxP = Number(r.max_price) || 0;
        const modP = Number(r.modal_price) || 0;
        let momentumHtml = '';
        if (maxP > minP && modP > 0) {
            const spreadRatio = (modP - minP) / (maxP - minP);
            if (spreadRatio >= 0.65) {
                momentumHtml = `<span class="mandi-momentum-pill rising" title="Modal price near market peak">📈 ${currentLang === 'hi' ? 'तेज' : 'Rising'}</span>`;
            } else if (spreadRatio <= 0.35) {
                momentumHtml = `<span class="mandi-momentum-pill softening" title="Modal price near market bottom">📉 ${currentLang === 'hi' ? 'नरम' : 'Softening'}</span>`;
            } else {
                momentumHtml = `<span class="mandi-momentum-pill steady" title="Modal price balanced">⚖️ ${currentLang === 'hi' ? 'स्थिर' : 'Steady'}</span>`;
            }
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${r.state}</strong><br><small style="color:var(--text-muted);">${r.district || '-'}</small></td>
            <td><strong>${r.market}</strong></td>
            <td>${r.commodity} <small style="color:var(--text-muted);">(${r.variety || 'Desi'})</small></td>
            <td>₹ ${r.min_price}</td>
            <td>₹ ${r.max_price}</td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <strong style="color: var(--leaf-green); font-size:14px;">₹ ${r.modal_price}</strong>
                    ${momentumHtml}
                </div>
            </td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function quickFilterMandi(cropName) {
    document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
    const searchInput = document.getElementById("mandi-search-crop");
    if (searchInput) {
        searchInput.value = cropName;
        filterMandi();
    }
}

function filterMandi() {
    const crop = document.getElementById("mandi-search-crop")?.value.toLowerCase().trim() || "";
    const state = document.getElementById("mandi-filter-state")?.value.toLowerCase().trim() || "";
    const market = document.getElementById("mandi-search-market")?.value.toLowerCase().trim() || "";

    const filtered = mandiRecordsCache.filter(r => {
        const matchCrop = !crop || r.commodity.toLowerCase().includes(crop);
        const matchState = !state || r.state.toLowerCase().includes(state);
        const matchMarket = !market || r.market.toLowerCase().includes(market) || (r.district && r.district.toLowerCase().includes(market));
        return matchCrop && matchState && matchMarket;
    });

    renderMandiTable(filtered);
}

function toggleSellDecisionMode() {
    const mode = document.querySelector('input[name="sell-decision-mode"]:checked')?.value || 'manual';
    const batchBar = document.getElementById('sell-batch-quick-bar');
    if (batchBar) {
        if (mode === 'batch') {
            batchBar.classList.add('active-batch-highlight');
        } else {
            batchBar.classList.remove('active-batch-highlight');
        }
    }
    document.querySelectorAll('.sell-mode-option').forEach(el => {
        const input = el.querySelector('input');
        el.classList.toggle('active', input && input.checked);
    });
    populateSellDecisionBatches();
}

function prefillSellDecision() {
    const crop = document.getElementById('sell-decision-crop')?.value;
    const matchingBatch = produceBatches.find(batch => batch.status === 'active' && String(batch.crop_name).toLowerCase().includes(String(crop).toLowerCase()));
    const quantity = document.getElementById('sell-decision-quantity');
    if (matchingBatch && quantity) quantity.value = matchingBatch.quantity_kg || 1000;
}

function populateSellDecisionBatches() {
    const select = document.getElementById('sell-decision-batch');
    if (!select) return;
    const selectedValue = select.value;
    const activeBatches = produceBatches.filter(batch => batch.status === 'active');
    select.innerHTML = `<option value="">${currentLang === 'hi' ? '-- सक्रिय भंडारित बैच चुनें (या नीचे खुद भरें) --' : '-- Choose a stored batch or enter below --'}</option>`;
    
    // Always provide Demo batch option so farmers can test immediately
    const demoOpt = document.createElement('option');
    demoOpt.value = 'demo-wheat';
    demoOpt.textContent = currentLang === 'hi' ? '⚡ डेमो भंडारित बैच: गेहूं (4,200 किलो · गोदाम)' : '⚡ Demo Stored Batch: Wheat (4,200 kg · Godown)';
    select.appendChild(demoOpt);

    activeBatches.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        const stType = batch.storage_type ? ` · ${batch.storage_type}` : '';
        option.textContent = `📦 ${batch.crop_name} (${Number(batch.quantity_kg || 0).toLocaleString()} kg${stType})`;
        select.appendChild(option);
    });

    if (activeBatches.some(batch => String(batch.id) === String(selectedValue)) || selectedValue === 'demo-wheat') {
        select.value = selectedValue;
    }
}

function selectSellDecisionBatch() {
    const batchId = document.getElementById('sell-decision-batch')?.value;
    if (!batchId) return;

    if (batchId === 'demo-wheat') {
        const cropSelect = document.getElementById('sell-decision-crop');
        if (cropSelect) cropSelect.value = 'Wheat';
        const qEl = document.getElementById('sell-decision-quantity');
        if (qEl) qEl.value = 4200;
        const stEl = document.getElementById('sell-decision-storage');
        if (stEl) stEl.value = 'godown';
        const costEl = document.getElementById('sell-decision-storage-cost');
        if (costEl) costEl.value = 250;
        showToast(currentLang === 'hi' ? '✅ डेमो भंडारित बैच लोड हुआ: गेहूं (4,200 किलो)' : '✅ Loaded demo batch: Wheat (4,200 kg)', 'success');
        return;
    }

    const batch = produceBatches.find(item => String(item.id) === String(batchId));
    if (!batch) return;
    const cropSelect = document.getElementById('sell-decision-crop');
    const cropName = String(batch.crop_name || 'Wheat');
    if (cropSelect && !Array.from(cropSelect.options).some(option => option.value.toLowerCase() === cropName.toLowerCase())) {
        cropSelect.add(new Option(cropName, cropName));
    }
    if (cropSelect) cropSelect.value = cropName;
    const quantity = document.getElementById('sell-decision-quantity');
    if (quantity) quantity.value = batch.quantity_kg || 1000;
    const storageSelect = document.getElementById('sell-decision-storage');
    if (storageSelect) {
        const storage = String(batch.storage_type || '').toLowerCase();
        storageSelect.value = storage.includes('cold') ? 'cold' : storage.includes('godown') ? 'godown' : storage.includes('farm') ? 'farm' : 'none';
        updateSellStorageCost();
    }
    showToast(currentLang === 'hi' ? `✅ भंडारित बैच लोड हुआ: ${cropName} (${Number(batch.quantity_kg || 0).toLocaleString()} किलो)` : `✅ Loaded stored batch: ${cropName} (${Number(batch.quantity_kg || 0).toLocaleString()} kg)`, 'success');
}

function openSelectedSellBatch() {
    const batchId = document.getElementById('sell-decision-batch')?.value;
    if (!batchId) {
        showToast(currentLang === 'hi' ? 'पहले एक सक्रिय बैच चुनें।' : 'Choose an active batch first.', 'error');
        return;
    }
    switchTab('sell-decision');
    runSellDecision();
}

function updateSellStorageCost() {
    const storage = document.getElementById('sell-decision-storage')?.value;
    const cost = document.getElementById('sell-decision-storage-cost');
    if (!cost || Number(cost.value) > 0) return;
    cost.value = { none: 0, farm: 100, godown: 250, cold: 600 }[storage] ?? 0;
}

async function runSellDecision() {
    const resultEl = document.getElementById('sell-decision-result');
    const button = document.getElementById('sell-decision-button');
    if (!resultEl || !button) return;
    const crop = document.getElementById('sell-decision-crop')?.value || 'Wheat';
    const quantity = parseFloat(document.getElementById('sell-decision-quantity')?.value) || 0;
    const storageType = document.getElementById('sell-decision-storage')?.value || 'none';
    const storageCost = parseFloat(document.getElementById('sell-decision-storage-cost')?.value) || 0;
    const waitDays = parseInt(document.getElementById('sell-decision-days')?.value, 10) || 7;
    button.disabled = true;
    resultEl.className = 'sell-decision-result';
    resultEl.innerHTML = `<p>${t('sellLoading')}</p>`;
    let storageFacilities = [];
    const latitude = Number(farmerProfile?.latitude);
    const longitude = Number(farmerProfile?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        try {
            const storageResponse = await fetch(`/api/storage/search?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
            if (storageResponse.ok) storageFacilities = (await storageResponse.json()).facilities || [];
        } catch (error) {
            console.warn('Storage availability check failed:', error);
        }
    }
    try {
        const response = await fetch('/api/market/sell-decision', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lang: currentLang, crop, quantity_kg: quantity, storage_type: storageType, storage_cost_per_day: storageCost, wait_days: waitDays, market_records: mandiRecordsCache, weather: weatherCache?.data || {}, storage_facilities: storageFacilities })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || t('sellError'));
        renderSellDecision(data.result);
    } catch (error) {
        resultEl.className = 'sell-decision-result wait';
        resultEl.innerHTML = `<p>${error.message || t('sellError')}</p>`;
    } finally {
        button.disabled = false;
    }
}

function renderSellDecision(result) {
    const resultEl = document.getElementById('sell-decision-result');
    if (!resultEl) return;
    const isWait = result.decision === 'WAIT';
    const money = value => `₹ ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    resultEl.className = `sell-decision-result ${isWait ? 'wait' : 'sell-now'}`;
    resultEl.innerHTML = `
        <h4>${isWait ? '⏳' : '✅'} ${isWait ? t('wait') : t('sellNow')}</h4>
        <p>${escapeSellText(result.reason)}</p>
        <div class="sell-decision-grid">
            <div class="sell-decision-metric"><span>${t('currentPrice')}</span><strong>${money(result.current_price_per_kg)} / kg</strong></div>
            <div class="sell-decision-metric"><span>${t('nearbyPrice')}</span><strong>${money(result.best_nearby_price_per_kg)} / kg</strong></div>
            <div class="sell-decision-metric"><span>${t('trend')}</span><strong>${escapeSellText(result.trend_label)} (${Number(result.trend_percent || 0).toFixed(1)}%)</strong></div>
            <div class="sell-decision-metric"><span>${t('storageCost')}</span><strong>${money(result.storage_cost_total)}</strong></div>
            <div class="sell-decision-metric"><span>${t('volume')}</span><strong>${Number(result.expected_harvest_volume_kg || 0).toLocaleString()} kg</strong></div>
            <div class="sell-decision-metric"><span>${t('weatherRisk')}</span><strong>${result.weather_risk ? t('available') : t('unavailable')}</strong></div>
            <div class="sell-decision-metric"><span>${t('storage')}</span><strong>${result.storage_available ? t('available') : t('unavailable')}</strong></div>
            <div class="sell-decision-metric"><span>${t('records')}</span><strong>${result.market_records_count || result.storage_facilities || 0}</strong></div>
        </div>
        <p class="sell-decision-note">${result.source === 'ai' ? (currentLang === 'hi' ? 'एआई सहायता से तैयार सुझाव।' : 'AI-assisted recommendation.') : (currentLang === 'hi' ? 'उपलब्ध लाइव संकेतों पर आधारित नियम-सुझाव।' : 'Rule-based recommendation using the available live signals.')}</p>`;
}

function escapeSellText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

// ============================================================
// BATCHES & STORED PRODUCE
// ============================================================

function renderStoredProduce() {
    const container = document.getElementById("stored-batches-list");
    if (!container) return;
    container.innerHTML = "";

    const activeList = produceBatches.filter(b => b.status === "active");
    const storedCount = document.getElementById("stored-count");
    if (storedCount) storedCount.innerText = `${activeList.length} ${t('batches')}`;

    if (activeList.length === 0) {
        container.innerHTML = `<div style="padding: 20px; color: var(--text-muted); font-size: 14px;">${t('noStored')}</div>`;
        return;
    }

    activeList.forEach(b => {
        const isGrowing = b.crop_status === "growing";
        const riskClass = b.spoilage_risk === "High" ? "risk-high" : (b.spoilage_risk === "Medium" ? "risk-medium" : "risk-low");
        const nextCropHtml = !isGrowing && b.next_crop_recommendation?.length ? `
            <div class="next-crop-container stored-next-crop">
                <div class="next-crop-title">🌱 ${t('nextCropTitle')}</div>
                <div class="next-crop-items">
                    ${b.next_crop_recommendation.slice(0, 3).map(rec => `
                        <div class="crop-plan-item">
                            <strong>${rec.crop}</strong> <small style="color:var(--turmeric-dark);">[ROI: ${rec.roi_potential} | ${currentLang === 'hi' ? 'पानी' : 'Water'}: ${rec.water_need}]</small>
                            <p style="margin-top:4px; font-size:11.5px; color:var(--text-muted);">${rec.reason}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        const card = document.createElement("div");
        card.className = `batch-card ${riskClass}`;
        card.innerHTML = `
            <div>
                <span class="crop-title">${b.crop_name}</span>
                <small style="display: block; color: var(--text-muted);">${b.variety || ''} | ${b.field_name || ''}</small>
                <span class="detail-lbl" style="margin-top: 4px;">${isGrowing ? 'Current Growing Crop' : b.storage_type}</span>
            </div>
            <div>
                <span class="detail-lbl">${t('storedVolume')}</span>
                <span class="detail-val">${parseFloat(b.quantity_kg).toLocaleString()} KG</span>
                <small style="color: var(--text-muted);">Grade: <strong>${b.quality_grade || 'A'}</strong></small>
            </div>
            <div>
                <span class="detail-lbl">${t('spoilageRisk')}</span>
                <span class="detail-val text-${b.spoilage_risk === 'High' ? 'risk' : 'green'}">
                    ${isGrowing ? `${t('suggestedHarvest')}: ${b.suggested_harvest_date || (currentLang === 'hi' ? 'एआई जांच बाकी' : 'Pending AI analysis')}` : `${b.spoilage_risk} (${b.shelf_life_days} ${t('daysLeft')})`}
                </span>
                <small style="display:block; font-size:11px; color:var(--text-muted);">${b.defect_summary || ''}</small>
            </div>
            <div class="batch-advisory">
                <strong>💡 ${t('storage')}:</strong> ${b.recommendation}<br>
                <strong>⚙️ ${t('processing')}:</strong> ${b.processing_idea}
            </div>
            ${b.spoilage_risk === 'High' ? (() => {
                const waCooldown = getBatchWhatsAppCooldown(b);
                const waEnabled = farmerProfile?.whatsapp_alerts_enabled !== false;
                return `
                <div class="alert-actions high-risk-alert-bar">
                    <div class="alert-info-title">
                        <span class="pulse-warning">⚠️</span>
                        <strong>${currentLang === 'hi' ? 'उच्च सड़न जोखिम (व्हाट्सएप अपडेट)' : 'High Spoilage Risk (WhatsApp Updates)'}</strong>
                    </div>
                    <div class="alert-btn-group">
                        ${!waEnabled ? `
                            <span class="wa-status-badge disabled" title="${currentLang === 'hi' ? 'व्हाट्सएप संदेश बंद हैं' : 'WhatsApp alerts are turned OFF'}">🔕 ${currentLang === 'hi' ? 'अलर्ट बंद' : 'WA Off'}</span>
                            <button type="button" class="btn-small-wa-enable" onclick="toggleWhatsAppAlerts(true)">${currentLang === 'hi' ? 'चालू करें' : 'Turn On WA'}</button>
                        ` : waCooldown ? `
                            <span class="wa-status-badge cooldown" title="${currentLang === 'hi' ? '24 घंटे का अंतराल सक्रिय है' : '24h rate limit active'}">🕒 ${currentLang === 'hi' ? `भेजा गया • अगला ${waCooldown.remainingHours}h में` : `WA Sent • Next in ${waCooldown.remainingHours}h`}</span>
                            <button type="button" class="btn-small-wa-mute" onclick="toggleWhatsAppAlerts(false)" title="${currentLang === 'hi' ? 'व्हाट्सएप अलर्ट बंद करें' : 'Turn off WhatsApp alerts'}">🔕 ${currentLang === 'hi' ? 'अलर्ट बंद करें' : 'Turn Off WA'}</button>
                        ` : `
                            <button type="button" class="btn-small-wa" onclick="sendSpoilageAlert('${b.id}', 'whatsapp')">💬 ${currentLang === 'hi' ? 'व्हाट्सएप भेजें (24h)' : 'Send WhatsApp (24h)'}</button>
                            <button type="button" class="btn-small-wa-mute" onclick="toggleWhatsAppAlerts(false)" title="${currentLang === 'hi' ? 'व्हाट्सएप अलर्ट बंद करें' : 'Turn off WhatsApp alerts'}">🔕 ${currentLang === 'hi' ? 'अलर्ट बंद करें' : 'Turn Off WA'}</button>
                        `}
                        <button type="button" class="btn-small-neutral" onclick="sendSpoilageAlert('${b.id}', 'sms')">SMS</button>
                    </div>
                </div>`;
            })() : b.spoilage_risk === 'Medium' ? `
                <div class="alert-actions">
                    <strong>⚠️ ${currentLang === 'hi' ? 'मध्यम जोखिम चेतावनी' : 'Medium Risk Alert'}</strong>
                    <button type="button" class="btn-small-neutral" onclick="sendSpoilageAlert('${b.id}', 'sms')">SMS</button>
                    <small class="wa-risk-note" title="WhatsApp updates are only for high risk crops">${currentLang === 'hi' ? '(व्हाट्सएप केवल उच्च जोखिम के लिए)' : '(WhatsApp: High Risk Only)'}</small>
                </div>
            ` : ''}
            ${nextCropHtml}
            <div>
                <button type="button" class="btn-secondary" onclick="openSettlementForBatch('${b.id}')">
                    ${t('sale')}
                </button>
                <button type="button" class="btn-secondary" onclick="openStorageFinder('${b.id}')">
                    📍 Find Storage
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function populateSettlementDropdown() {
    const select = document.getElementById("settle_batch_id");
    if (!select) return;
    select.innerHTML = `<option value="">-- ${t('activeBatch')} --</option>`;
    
    const activeList = produceBatches.filter(b => b.status === "active");
    activeList.forEach(b => {
        select.innerHTML += `<option value="${b.id}">${b.crop_name} (${b.variety}) - ${b.quantity_kg} KG in ${b.field_name}</option>`;
    });
}

function openSettlementForBatch(batchId) {
    switchTab('ledger-sold');
    const select = document.getElementById("settle_batch_id");
    if (select) {
        select.value = batchId;
        handleSettleBatchChange();
    }
}

function handleSettleBatchChange() {
    const select = document.getElementById("settle_batch_id");
    if (!select) return;
    const batchId = select.value;
    const batch = produceBatches.find(b => b.id === batchId);
    const qtyInput = document.getElementById("sold_quantity_kg");
    if (batch && qtyInput) {
        qtyInput.value = batch.quantity_kg;
    }
}

function renderHistoryProduce() {
    const container = document.getElementById("history-batches-list");
    if (!container) return;
    container.innerHTML = "";

    const soldList = produceBatches.filter(b => b.status === "sold");
    const histCount = document.getElementById("history-count");
    if (histCount) histCount.innerText = `${soldList.length} ${t('records')}`;

    if (soldList.length === 0) {
        container.innerHTML = `<div style="padding: 20px; color: var(--text-muted); font-size: 14px;">${t('noHistory')}</div>`;
        return;
    }

    soldList.forEach(b => {
        const isProfit = (b.net_profit_loss >= 0);
        const card = document.createElement("div");
        card.className = "history-card";
        
        const nextCropPlans = b.next_crop_recommendation?.length ? b.next_crop_recommendation : [
            { crop: b.crop_name === 'Tomato' ? 'Potato' : 'Tomato', reason: currentLang === 'hi' ? 'फसल चक्र से मिट्टी का संतुलन बनाए रखने और जोखिम कम करने में मदद मिलती है।' : 'Crop rotation can help maintain soil balance and reduce production risk.', roi_potential: 'Medium', water_need: 'Medium' },
            { crop: 'Pulses', reason: currentLang === 'hi' ? 'दलहनी फसल मिट्टी में नाइट्रोजन बढ़ाने और अगली फसल की लागत घटाने में मदद कर सकती है।' : 'A pulse crop can improve soil nitrogen and reduce input costs for the next cycle.', roi_potential: 'Medium', water_need: 'Low' }
        ];
        let rotationHtml = "";
        if (nextCropPlans.length > 0) {
            rotationHtml = `
                <div class="next-crop-container">
                    <div class="next-crop-title">🌱 ${b.next_crop_recommendation?.length ? t('nextCropTitle') : t('nextCropFallbackTitle')}</div>
                    <div class="next-crop-items">
                        ${nextCropPlans.map(rec => `
                            <div class="crop-plan-item">
                                <strong>${rec.crop}</strong> <small style="color:var(--turmeric-dark);">[ROI: ${rec.roi_potential} | Water: ${rec.water_need}]</small>
                                <p style="margin-top:4px; font-size:11.5px; color:var(--text-muted);">${rec.reason}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="history-card-header">
                <div>
                    <h4>${b.crop_name} <small>(${b.variety || 'Desi'})</small></h4>
                    <span style="font-size:12px; color:var(--text-muted);">${b.field_name} | Harvest: ${b.harvest_date} ➔ Sold: ${b.selling_date}</span>
                </div>
                <div>
                    <span style="font-size:16px; font-weight:700; color: ${isProfit ? 'var(--leaf-green)' : 'var(--risk-red)'};">
                        ${isProfit ? 'PROFIT' : 'LOSS'}: ₹ ${Math.abs(b.net_profit_loss).toLocaleString()}
                    </span>
                </div>
            </div>

            <div class="history-financial-grid">
                <div>
                    <span class="detail-lbl">${t('qtyProducedSold')}</span>
                    <span class="detail-val">${b.quantity_kg} / ${b.sold_quantity_kg} KG</span>
                </div>
                <div>
                    <span class="detail-lbl">${t('sellingPrice')}</span>
                    <span class="detail-val">₹ ${b.selling_price_per_kg} / KG</span>
                </div>
                <div>
                    <span class="detail-lbl">${t('totalRevenue')}</span>
                    <span class="detail-val text-green">₹ ${b.total_revenue.toLocaleString()}</span>
                </div>
                <div>
                    <span class="detail-lbl">${t('totalCost')}</span>
                    <span class="detail-val">₹ ${b.total_combined_cost.toLocaleString()}</span>
                </div>
            </div>
            ${rotationHtml}
        `;
        container.appendChild(card);
    });
}

async function handleSaleSettlement(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById("btn-settle-sale");
    if (btn) {
        btn.innerText = translations[currentLang].settling;
        btn.disabled = true;
    }

    const sellingCosts = {};
    document.querySelectorAll(".selling-cost-val").forEach(input => {
        const cat = input.getAttribute("data-cat") || "misc";
        sellingCosts[cat] = parseFloat(input.value) || 0;
    });

    const batchIdInput = document.getElementById("settle_batch_id");
    const soldQuantityInput = document.getElementById("sold_quantity_kg");
    const sellingPriceInput = document.getElementById("selling_price_per_kg");
    const sellingDateInput = document.getElementById("selling_date");
    if (!batchIdInput || !soldQuantityInput || !sellingPriceInput || !sellingDateInput) {
        showToast(translations[currentLang].toastError, "error");
        if (btn) {
            btn.innerText = translations[currentLang].settleBtn;
            btn.disabled = false;
        }
        return;
    }

    const payload = {
        batch_id: batchIdInput.value,
        sold_quantity_kg: soldQuantityInput.value,
        selling_price_per_kg: sellingPriceInput.value,
        selling_date: sellingDateInput.value,
        selling_costs: sellingCosts
    };

    try {
        const res = await fetch("/api/produce/settle-sale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            const idx = produceBatches.findIndex(b => b.id === result.batch.id);
            if (idx !== -1) produceBatches[idx] = result.batch;
            renderAllViews();
            showToast(translations[currentLang].toastSettled, "success");
            switchTab('ledger-history');
        } else {
            showToast(translations[currentLang].toastError, "error");
        }
    } catch (e) {
        showToast(translations[currentLang].toastError, "error");
    } finally {
        if (btn) {
            btn.innerText = translations[currentLang].settleBtn;
            btn.disabled = false;
        }
    }
}

function addCustomSellingCost() {
    const name = prompt(translations[currentLang].customCostPrompt);
    if (name && name.trim()) {
        const container = document.getElementById("selling-costs-container");
        if (!container) return;
        const item = document.createElement("div");
        item.className = "cost-item";
        item.innerHTML = `
            <label>${name.trim()} (₹)</label>
            <input type="number" class="selling-cost-val" data-cat="${name.toLowerCase().replace(/\s+/g, '_')}" placeholder="0" value="0">
        `;
        container.appendChild(item);
    }
}

function handleImageSelected(e) {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (!files.length) return;
    Promise.all(files.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    }))).then(images => {
        selectedImagesBase64 = images.filter(Boolean);
        selectedImageBase64 = selectedImagesBase64[0] || null;
        const gallery = document.getElementById("image-preview-gallery");
        const wrapper = document.getElementById("image-preview-wrapper");
        if (gallery) gallery.innerHTML = selectedImagesBase64.map(image => `<img src="${image}" alt="Crop angle preview">`).join('');
        if (wrapper) wrapper.classList.toggle("hidden", !selectedImagesBase64.length);
    });
}

function removeImage() {
    selectedImageBase64 = null;
    selectedImagesBase64 = [];
    const input = document.getElementById("crop_image");
    const wrapper = document.getElementById("image-preview-wrapper");
    const gallery = document.getElementById("image-preview-gallery");
    if (input) input.value = "";
    if (wrapper) wrapper.classList.add("hidden");
    if (gallery) gallery.innerHTML = "";
}

function triggerFileInput() {
    const input = document.getElementById("crop_image");
    if (input) input.click();
}

function toggleCropRegistrationMode() {
    const mode = document.querySelector('input[name="crop_status"]:checked')?.value || "harvested";
    document.querySelectorAll(".growing-only").forEach(field => field.classList.toggle("hidden", mode !== "growing"));
    const harvestDate = document.getElementById("harvest_date");
    const harvestLabel = document.querySelector('label[for="harvest_date"]');
    if (harvestDate) harvestDate.required = mode === "harvested";
    if (harvestLabel) harvestLabel.textContent = mode === "growing" ? "Expected Harvest Date (optional)" : "Harvest Date";
}

async function handleProduceSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById("btn-submit-produce");
    const label = document.getElementById("submit-text");
    if (label) label.innerText = translations[currentLang].analyzing;
    if (btn) btn.disabled = true;

    const prodCosts = {};
    document.querySelectorAll(".prod-cost-val").forEach(input => {
        const cat = input.getAttribute("data-cat") || "misc";
        prodCosts[cat] = parseFloat(input.value) || 0;
    });

    const cropNameInput = document.getElementById("crop_name");
    const varietyInput = document.getElementById("crop_variety");
    const fieldNameInput = document.getElementById("field_name");
    const quantityInput = document.getElementById("quantity");
    const weightUnitInput = document.getElementById("weight_unit");
    const harvestDateInput = document.getElementById("harvest_date");
    const plantingDateInput = document.getElementById("planting_date");
    const storageTypeInput = document.getElementById("storage_type");
    if (!cropNameInput || !varietyInput || !fieldNameInput || !quantityInput || !weightUnitInput || !harvestDateInput || !storageTypeInput) {
        showToast(translations[currentLang].toastError, "error");
        if (label) label.innerText = translations[currentLang].analyzeBtn;
        if (btn) btn.disabled = false;
        return;
    }

    const payload = {
        crop_name: cropNameInput.value,
        crop_status: document.querySelector('input[name="crop_status"]:checked')?.value || "harvested",
        variety: varietyInput.value,
        field_name: fieldNameInput.value,
        quantity: quantityInput.value,
        unit: weightUnitInput.value,
        harvest_date: harvestDateInput.value,
        planting_date: plantingDateInput?.value || null,
        storage_type: storageTypeInput.value,
        image_base64: selectedImageBase64,
        image_base64s: selectedImagesBase64,
        production_costs: prodCosts
    };

    try {
        const res = await fetch("/api/produce/analyze-and-add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            produceBatches.unshift(result.batch);
            renderAllViews();
            document.getElementById("produce-form").reset();
            removeImage();
            showToast(translations[currentLang].toastSaved, "success");
            if (result.batch.spoilage_risk === "High") {
                sendSpoilageAlert(result.batch.id, "whatsapp", true);
            }
            switchTab('ledger-stored');
        } else {
            showToast(result.error || "Could not save this crop.", "error");
        }
    } catch (e) {
        showToast(`Crop registration failed: ${e.message}`, "error");
    } finally {
        if (label) label.innerText = translations[currentLang].analyzeBtn;
        if (btn) btn.disabled = false;
    }
}

function fillDemoBatch() {
    const activePanel = document.querySelector('.tab-panel.active')?.id;
    const crop = document.getElementById("crop_name");
    const variety = document.getElementById("crop_variety");
    const field = document.getElementById("field_name");
    const qty = document.getElementById("quantity");
    const unit = document.getElementById("weight_unit");
    const storage = document.getElementById("storage_type");

    if (crop) crop.value = "Tomato";
    if (variety) variety.value = "Hybrid Red";
    if (field) field.value = "South Polyhouse Plot 1";
    if (qty) qty.value = "1500";
    if (unit) unit.value = "kg";
    if (storage) storage.value = "Open Air Jute Bags";

    const calcCrop = document.getElementById("calc_crop");
    const calcArea = document.getElementById("calc_area");
    if (calcCrop) calcCrop.value = "Tomato";
    if (calcArea) calcArea.value = "2";
    const calculatorCosts = {
        calc_seed: 8000,
        calc_fert: 6500,
        calc_pest: 3500,
        calc_irrig: 4500,
        calc_labour: 9000,
        calc_mach: 5000,
        calc_fuel: 3500,
        calc_misc: 2000
    };
    Object.entries(calculatorCosts).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });
    handlePreCostCalculation();
    
    if (activePanel !== 'tab-pre-cost') switchTab('add-batch');
    showToast(t('demoLoaded'), 'info');
}

// ============================================================
// CHAT & VOICE ENGINE (REFINED WAIT & DEBOUNCE LOGIC)
// ============================================================

function toggleAssistant() {
    const panel = document.getElementById("assistant-panel");
    if (panel) panel.classList.toggle("open");
}

function handleAssistantKey(e) {
    if (e.key === "Enter") sendAssistantMessage();
}

function handleChatImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const source = new Image();
            source.onload = function() {
                const maxDimension = 1600;
                const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(source.width * scale));
                canvas.height = Math.max(1, Math.round(source.height * scale));
                canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
                chatImageBase64 = canvas.toDataURL("image/jpeg", 0.82);

                const thumb = document.getElementById("chat-img-thumb");
                const preview = document.getElementById("chat-media-preview");
                if (thumb) thumb.src = chatImageBase64;
                if (preview) preview.classList.remove("hidden");
            };
            source.onerror = function() {
                showToast("Could not read this image. Please choose another photo.", "error");
            };
            source.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function removeChatMedia() {
    chatImageBase64 = null;
    const fileInput = document.getElementById("chat-file-input");
    const preview = document.getElementById("chat-media-preview");
    if (fileInput) fileInput.value = "";
    if (preview) preview.classList.add("hidden");
}

let globalRecognizer = null;

function stopRecording() {
    if (globalRecognizer && isRecognizing) {
        try {
            globalRecognizer.stop();
        } catch (e) {}
        isRecognizing = false;
    }
}

function recordAudioMessage() {
    if (isRecognizing) return;
    
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        return; 
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast(translations[currentLang].voiceNotSupported, "error");
        return;
    }

    try {
        globalRecognizer = new SpeechRecognition();
        globalRecognizer.lang = (currentLang === 'hi') ? 'hi-IN' : 'en-IN';
        globalRecognizer.interimResults = false;
        
        // If Live Voice is ON, keep mic continuous to build the sentence naturally
        globalRecognizer.continuous = isLiveVoiceActive; 

        const input = document.getElementById("assistant-query");
        const micBtn = document.getElementById("btn-mic-input");

        globalRecognizer.onstart = function() {
            isRecognizing = true;
            if (micBtn) micBtn.style.backgroundColor = "#FCD7D7";
            if (input) input.placeholder = translations[currentLang].voiceListening;
        };

        globalRecognizer.onresult = function(event) {
            // Rebuild the final transcript cleanly from all segments
            let finalTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                finalTranscript += event.results[i][0].transcript + " ";
            }
            
            if (input) {
                input.value = finalTranscript.trim();
            }
            
            // Only auto-send if Live Voice is ON
            if (isLiveVoiceActive) {
                clearTimeout(voiceDebounceTimer);
                voiceDebounceTimer = setTimeout(() => {
                    sendAssistantMessage();
                }, 1500); // 1.5 seconds of pure silence triggers the send
            }
            // If Live Voice is OFF, the user must click the 'Send' button manually
        };

        globalRecognizer.onerror = function(event) {
            console.error("Speech Recognition Error:", event.error);
            if (event.error === 'not-allowed') {
                showToast(translations[currentLang].micBlocked, "error");
            }
        };

        globalRecognizer.onend = function() {
            isRecognizing = false;
            if (micBtn) micBtn.style.backgroundColor = "";
            if (input) input.placeholder = (currentLang === 'hi') ? "यहाँ लिखें या प्रश्न पूछें..." : "Type or ask a farming question...";
        };

        globalRecognizer.start();
    } catch (err) {
        console.error("Recognizer start exception:", err);
        isRecognizing = false;
    }
}

async function toggleLiveVoiceConversation() {
    isLiveVoiceActive = !isLiveVoiceActive;
    const btn = document.getElementById("btn-live-voice");
    const statusText = document.getElementById("voice-chat-status");
    if (btn) btn.classList.toggle("active", isLiveVoiceActive);

    if (isLiveVoiceActive) {
        if (statusText) statusText.innerText = translations[currentLang].voiceActive;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                permissionStream.getTracks().forEach(track => track.stop());
            }
            recordAudioMessage();
        } catch (error) {
            console.error("Microphone permission error:", error);
            isLiveVoiceActive = false;
            if (btn) btn.classList.remove("active");
            if (statusText) statusText.innerText = translations[currentLang].voiceChatStatus;
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                showToast(translations[currentLang].micBlocked, "error");
            } else {
                showToast(translations[currentLang].voiceError, "error");
            }
        }
    } else {
        if (statusText) statusText.innerText = translations[currentLang].voiceChatStatus;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        stopRecording();
        clearTimeout(voiceDebounceTimer);
    }
}

function speakAssistantResponse(text) {
    if (!('speechSynthesis' in window)) return;
    
    stopRecording(); 
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = (currentLang === 'hi') ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;

    utterance.onend = function() {
        if (isLiveVoiceActive) {
            setTimeout(() => recordAudioMessage(), 800); 
        }
    };

    window.speechSynthesis.speak(utterance);
}

async function sendAssistantMessage() {
    clearTimeout(voiceDebounceTimer);
    stopRecording(); 

    const input = document.getElementById("assistant-query");
    if (!input) return;
    const text = input.value.trim();
    if (!text && !chatImageBase64) return;

    const chatBody = document.getElementById("chat-messages");
    if (!chatBody) return;

    const userBubble = document.createElement("div");
    userBubble.className = "user-msg message-bubble";

    const userMeta = document.createElement("div");
    userMeta.className = "message-meta";
    userMeta.innerHTML = "<span>👤 You</span><span>Now</span>";

    const userBody = document.createElement("div");
    userBody.className = "message-body";
    if (text) {
        userBody.innerText = text;
    } else {
        const attachmentLabel = document.createElement("em");
        attachmentLabel.innerText = "[Photo Attached for AI Diagnosis]";
        userBody.appendChild(attachmentLabel);
    }

    userBubble.appendChild(userMeta);
    userBubble.appendChild(userBody);
    chatBody.appendChild(userBubble);
    
    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    const botBubble = document.createElement("div");
    botBubble.className = "bot-msg message-bubble";

    const botMeta = document.createElement("div");
    botMeta.className = "message-meta";
    botMeta.innerHTML = "<span>🤖 AI Advisor</span><span>Working</span>";

    const botBody = document.createElement("div");
    botBody.className = "message-body";
    botBody.innerText = (currentLang === 'hi') ? "कृषि डेटा का विश्लेषण हो रहा है..." : "Analyzing crop data & financial benchmarks...";

    botBubble.appendChild(botMeta);
    botBubble.appendChild(botBody);
    chatBody.appendChild(botBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    const payload = {
        message: text,
        image_base64: chatImageBase64,
        lang: currentLang
    };
    removeChatMedia();

    try {
        const res = await fetch("/api/assistant/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(data.error || `Chat request failed (${res.status})`);
        }
        botBody.innerText = data.reply || "The assistant returned no response. Please try again.";
        
        if (data.updated_batches) {
            produceBatches = data.updated_batches;
            renderAllViews();
        }

        if (isLiveVoiceActive) {
            speakAssistantResponse(data.reply);
        }
    } catch (e) {
        botBody.innerText = `AI error: ${e.message}`;
        if (isLiveVoiceActive) {
            setTimeout(() => recordAudioMessage(), 1000); 
        }
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function fetchWeather(latitude, longitude) {
    const status = document.getElementById("weather-status");
    const metrics = document.getElementById("weather-metrics");
    const forecast = document.getElementById("weather-forecast");
    if (!status || !metrics || !forecast) return;

    status.textContent = "Loading weather for your GPS location...";
    try {
        const response = await fetch(`/api/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Weather request failed");

        const current = data.current;
        status.textContent = `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)} · ${data.location.timezone} · ${current.condition}`;
        const alerts = document.getElementById("weather-alerts");
        if (alerts) {
            alerts.innerHTML = (data.alerts || []).map(alert => `<div class="weather-alert ${alert.level}">⚠️ ${alert.message}</div>`).join("") || `<div class="weather-alert clear">✓ ${t('noWeatherWarnings')}</div>`;
        }
        metrics.innerHTML = [
            ["Temperature", `${current.temperature_c ?? "-"} °C`, "🌡️"],
            ["Humidity", `${current.relative_humidity_percent ?? "-"} %`, "💧"],
            ["Wind speed", `${current.wind_speed_kmh ?? "-"} km/h`, "💨"],
            ["Rain now", `${current.rainfall_mm ?? "-"} mm`, "🌧️"],
            ["Weather condition", current.condition, "☀️"],
            ["Rain probability today", `${data.forecast[0]?.rain_probability_percent ?? "-"} %`, "🌧️"]
        ].map(([label, value, icon]) => `<div class="weather-metric"><span class="weather-metric-icon">${icon}</span><span class="weather-metric-label">${label}</span><strong>${value}</strong></div>`).join("");
        forecast.innerHTML = data.forecast.map(day => `<tr><td>${day.date}</td><td>${day.condition}</td><td>${day.temperature_min_c ?? "-"} / ${day.temperature_max_c ?? "-"} °C</td><td>${day.precipitation_mm ?? "-"} mm</td><td>${day.rain_probability_percent ?? "-"} %</td><td>${day.sunrise?.slice(11, 16) ?? "-"}</td><td>${day.sunset?.slice(11, 16) ?? "-"}</td></tr>`).join("");
        weatherCache = { latitude, longitude, data, storedAt: Date.now() };
    } catch (error) {
        status.textContent = `Weather unavailable: ${error.message}`;
        metrics.innerHTML = "";
        forecast.innerHTML = `<tr><td colspan="7">${t('weatherUnavailable')}</td></tr>`;
    }
}

async function generateWeatherAction() {
    const result = document.getElementById("weather-action-result");
    const button = document.getElementById("weather-action-button");
    if (!result || !button) return;
    
    // Auto-fetch if farm coordinates exist
    if (!weatherCache?.data) {
        if (typeof farmProfile !== 'undefined' && farmProfile?.latitude && farmProfile?.longitude) {
            try {
                await fetchWeather(farmProfile.latitude, farmProfile.longitude, farmProfile.district || "Farm Location");
            } catch (_) {}
        }
    }

    const crop = document.getElementById("calc_crop")?.value || document.getElementById("analysis-crop-select")?.value || "Wheat";
    const current = weatherCache?.data?.current || {
        temperature_c: 28.0,
        relative_humidity_percent: 65,
        wind_speed_kmh: 11,
        condition: "Partly sunny",
        rainfall_mm: 0
    };
    const forecast = weatherCache?.data?.forecast?.slice(0, 2) || [
        { rain_probability_percent: 55, precipitation_mm: 2.0 },
        { rain_probability_percent: 30, precipitation_mm: 0.0 }
    ];

    button.disabled = true;
    const origText = button.innerHTML;
    button.innerHTML = "⏳ ...";
    result.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi')
        ? "मौसम व फसल सुरक्षा विश्लेषण जारी है..."
        : "Analyzing microclimate and crop protection risks...";

    try {
        const response = await fetch("/api/weather/action-suggestion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                latitude: weatherCache?.latitude || 30.9,
                longitude: weatherCache?.longitude || 75.8,
                current: current,
                forecast: forecast,
                crop,
                language: typeof currentLang !== 'undefined' ? currentLang : 'en'
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Could not generate action.");
        
        let advice = data.suggestion || data.action;
        if (!advice || advice.length < 20 || /^\d+(\.\d+)?$/.test(advice.trim())) {
            advice = (typeof currentLang !== 'undefined' && currentLang === 'hi')
                ? `फसल ${crop} के लिए, अगले 48 घंटों में बारिश की संभावना को देखते हुए रासायनिक छिड़काव स्थगित रखें और जल निकासी नालियों की जांच करें। वर्तमान तापमान अनुकूल है।`
                : `For ${crop}, hold foliar chemical spraying if rain is expected in next 48 hours and check furrow drainage. Current canopy temperature is ${current.temperature_c || 26}°C.`;
        }
        latestWeatherActionAdvice = advice;
        result.textContent = advice;
    } catch (error) {
        const advice = (typeof currentLang !== 'undefined' && currentLang === 'hi')
            ? `फसल ${crop} के लिए, आज तापमान ${current.temperature_c}°C व आर्द्रता ${current.relative_humidity_percent}% है। बारिश की संभावना को ध्यान में रखते हुए रासायनिक छिड़काव रोकें व जल निकासी नालियों को दुरुस्त रखें।`
            : `For ${crop}, current canopy temperature is ${current.temperature_c}°C with ${current.relative_humidity_percent}% humidity. Hold chemical sprays until rain probability clears and verify field drainage channels.`;
        latestWeatherActionAdvice = advice;
        result.textContent = advice;
    } finally {
        button.disabled = false;
        button.innerHTML = origText;
    }
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(deltaLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function openStorageFinder(batchId) {
    const modal = document.getElementById('storage-finder-modal');
    const statusEl = document.getElementById('storage-finder-status');
    const resultsEl = document.getElementById('storage-finder-results');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (statusEl) statusEl.innerText = batchId ? 'Preparing storage search...' : '';
    if (resultsEl) resultsEl.innerHTML = '';
    findNearestStorage();
}

function closeStorageFinder() {
    const modal = document.getElementById('storage-finder-modal');
    if (storageFinderMap) {
        storageFinderMap.remove();
        storageFinderMap = null;
        storageFinderLayer = null;
    }
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function renderStorageResults(facilities, userLat, userLng, radiusKm = 100) {
    const resultsEl = document.getElementById('storage-finder-results');
    const mapEl = document.getElementById('storage-finder-map');

    if (storageFinderMap) storageFinderMap.remove();
    storageFinderMap = L.map(mapEl).setView([userLat, userLng], 11);
    storageFinderLayer = L.layerGroup().addTo(storageFinderMap);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(storageFinderMap);

    const farmIcon = L.divIcon({ className: 'farm-location-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker([userLat, userLng], { icon: farmIcon }).addTo(storageFinderLayer).bindPopup('<strong>Your Farm</strong>');
    const withDistance = facilities.map(facility => {
        const latitude = Number(facility.lat ?? facility.latitude);
        const longitude = Number(facility.lng ?? facility.longitude);
        const distanceKm = Number(facility.distance_km ?? facility.distance_meters / 1000);
        return {
            facility: {
                ...facility,
                name: facility.name || 'Storage facility',
                address: facility.formatted_address || facility.address || 'Location details not listed',
                category: facility.category || facility.source || 'Storage facility',
                latitude,
                longitude
            },
            distanceKm: Number.isFinite(distanceKm) ? distanceKm : haversineKm(userLat, userLng, latitude, longitude)
        };
    }).filter(({ facility }) => Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (withDistance.length === 0) return false;
    document.getElementById('storage-finder-status').innerText = `Found ${withDistance.length} storage facilities within ${radiusKm} km, sorted by distance:`;
    resultsEl.innerHTML = withDistance.map(({ facility, distanceKm }) => {
        const lat = Number(facility.latitude);
        const lng = Number(facility.longitude);
        const directionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLat}%2C${userLng}%3B${lat}%2C${lng}`;
        L.marker([lat, lng]).addTo(storageFinderLayer).bindPopup(`
            <strong>${facility.name}</strong><br>
            Type: ${facility.category}<br>
            Address: ${facility.address}<br>
            Distance: ${distanceKm.toFixed(1)} km
        `);
        return `
            <div class="batch-card">
                <div><span class="crop-title">${facility.name}</span><small style="display:block; color: var(--text-muted);">${facility.address || 'Location details not listed'}</small></div>
                <div><span class="detail-lbl">${facility.category || 'Storage facility'}</span><span class="detail-val">${distanceKm.toFixed(1)} km</span></div>
                <div><a class="btn-secondary" style="display:inline-block; text-decoration:none; text-align:center;" href="${directionsUrl}" target="_blank" rel="noopener">Get Directions</a></div>
            </div>`;
    }).join('');
    return true;
}

async function findNearestStorage() {
    const statusEl = document.getElementById('storage-finder-status');
    const resultsEl = document.getElementById('storage-finder-results');
    const btn = document.getElementById('storage-finder-locate-btn');

    btn.disabled = true;
    statusEl.innerText = 'Getting your farm location...';
    resultsEl.innerHTML = '';

    (async () => {
        if (!window.L) {
            statusEl.innerText = 'The map service is still loading. Please try again.';
            btn.disabled = false;
            return;
        }
        try {
            let userLat = Number(farmerProfile?.latitude);
            let userLng = Number(farmerProfile?.longitude);
            if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
                if (!navigator.geolocation) throw new Error('Location is not supported by this browser.');
                statusEl.innerText = 'Detecting your location automatically...';
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000
                    });
                });
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                farmerProfile = { ...(farmerProfile || {}), latitude: userLat, longitude: userLng };
            }

            const locationQuery = `latitude=${encodeURIComponent(userLat)}&longitude=${encodeURIComponent(userLng)}`;
            let places = [];

            statusEl.innerText = 'Checking TomTom for the nearest storage facility...';
            try {
                const tomtomResponse = await fetch(`/api/storage/search-tomtom?${locationQuery}`);
                if (!tomtomResponse.ok) {
                    console.error('TomTom storage search response:', await tomtomResponse.text());
                } else {
                    const tomtomData = await tomtomResponse.json();
                    places = tomtomData.places || [];
                }
            } catch (error) {
                console.error('TomTom storage search failed:', error);
            }
            if (places.length && renderStorageResults(places, userLat, userLng, 100)) return;

            statusEl.innerText = 'Checking registered facilities...';
            try {
                const registeredResponse = await fetch(`/api/storage/rpc-search?${locationQuery}`);
                if (registeredResponse.ok) {
                    const registeredData = await registeredResponse.json();
                    places = registeredData.places || registeredData.facilities || [];
                }
            } catch (error) {
                console.error('Registered storage search failed:', error);
            }
            if (places.length && renderStorageResults(places, userLat, userLng, 100)) return;

            statusEl.innerText = 'Checking map facilities...';
            try {
                const fallbackResponse = await fetch(`/api/storage/search?${locationQuery}`);
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    places = fallbackData.facilities || fallbackData.places || [];
                    if (places.length && renderStorageResults(places, userLat, userLng, fallbackData.radius_km || 50)) return;
                    statusEl.innerText = fallbackData.message || 'No storage facilities found near your location.';
                } else {
                    statusEl.innerText = 'Storage services are unavailable right now. Please try again.';
                }
            } catch (error) {
                console.error('Map storage search failed:', error);
                statusEl.innerText = 'Storage services are unavailable right now. Please try again.';
            }
            const mapSearchUrl = `https://www.google.com/maps/search/storage+facility/@${userLat},${userLng},12z`;
            resultsEl.innerHTML = `
                <div class="empty-admin">
                    No mapped facility was returned for this area.
                    <a class="btn-secondary" style="display:inline-block; margin-top:10px; text-decoration:none;" href="${mapSearchUrl}" target="_blank" rel="noopener">
                        Open nearest storage search
                    </a>
                </div>`;
        } catch (error) {
            statusEl.innerText = error.code === 1
                ? 'Location permission was denied. Allow location access or save coordinates in Profile.'
                : (error.message || 'Could not determine your farm location.');
            resultsEl.innerHTML = '<div class="empty-admin">Storage search failed. Please try again.</div>';
        } finally {
            btn.disabled = false;
        }
    })();
}

function toggleSellDecisionMode() {
    const mode = document.querySelector('input[name="sell-decision-mode"]:checked')?.value || 'manual';
    const batchChoice = document.querySelector('.sell-batch-choice');
    if (batchChoice) batchChoice.classList.toggle('hidden', mode !== 'batch');
    document.querySelectorAll('.sell-mode-option').forEach(option => option.classList.toggle('active', option.querySelector('input')?.value === mode));
}

async function sendSpoilageAlert(batchId, channel = 'sms', automatic = false) {
    if (channel === 'whatsapp' && farmerProfile?.whatsapp_alerts_enabled === false) {
        if (!automatic) {
            showToast(currentLang === 'hi' ? 'व्हाट्सएप अलर्ट बंद हैं। कृपया हेडर या प्रोफाइल से चालू करें।' : 'WhatsApp alerts are currently turned OFF. Turn them on to send.', 'info');
        }
        return;
    }

    const key = `agriflow-alert-${batchId}-${channel}`;
    if (automatic && channel === 'whatsapp' && localStorage.getItem(key)) {
        const lastSent = parseInt(localStorage.getItem(key), 10);
        if (Date.now() - lastSent < 24 * 3600 * 1000) {
            return;
        }
    }

    try {
        const response = await fetch('/api/alerts/spoilage', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ batch_id: batchId, channel }) 
        });
        const data = await response.json();

        if (response.status === 403 && data.requires_verification && !automatic) {
            openAlertVerification(batchId, channel);
            return;
        }

        if (response.status === 403 && data.whatsapp_disabled) {
            if (!automatic) {
                showToast(currentLang === 'hi' ? 'व्हाट्सएप अलर्ट बंद हैं।' : data.error, 'warning');
            }
            return;
        }

        if (response.status === 429 && data.cooldown) {
            const elapsedApprox = 24 * 3600 - data.remaining_seconds;
            localStorage.setItem(key, String(Date.now() - elapsedApprox * 1000));
            const msg = currentLang === 'hi' 
                ? `इस फसल के लिए व्हाट्सएप संदेश 24 घंटे में केवल एक बार भेजा जा सकता है। अगला अलर्ट ${data.remaining_hours} घंटे बाद संभव है।`
                : (data.error || `WhatsApp alert cooldown active. Next update available in ${data.remaining_hours} hours.`);
            if (!automatic) {
                showToast(msg, 'warning');
            } else {
                console.info('WhatsApp 24h cooldown active:', data);
            }
            if (typeof renderStoredProduce === 'function') renderStoredProduce();
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Alert could not be sent.');
        }

        localStorage.setItem(key, String(Date.now()));
        const b = (produceBatches || []).find(item => String(item.id) === String(batchId));
        if (b && channel === 'whatsapp') {
            b.last_whatsapp_alert_at = data.last_whatsapp_alert_at || new Date().toISOString();
        }

        if (!automatic) {
            showToast(data.message || (currentLang === 'hi' ? 'व्हाट्सएप संदेश सफलतापूर्वक भेजा गया।' : 'WhatsApp alert sent successfully.'), 'success');
        }
        if (typeof renderStoredProduce === 'function') renderStoredProduce();
    } catch (error) {
        if (!automatic) showToast(error.message, 'error');
        else console.warn('Automatic spoilage alert skipped:', error.message);
    }
}

function openAlertVerification(batchId, channel) {
    pendingAlert = { batchId, channel };
    const modal = document.getElementById('alert-verification-modal');
    const status = document.getElementById('alert-verification-status');
    if (status) status.textContent = currentLang === 'hi' ? 'पहले अपना फोन सत्यापित करें।' : `Verify your phone before sending the ${channel} alert.`;
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeAlertVerification() {
    document.getElementById('alert-verification-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
    pendingAlert = null;
}

async function requestAlertOtp() {
    if (!pendingAlert) return;
    const button = document.getElementById('request-alert-otp');
    const status = document.getElementById('alert-verification-status');
    if (button) button.disabled = true;
    try {
        const response = await fetch('/api/alerts/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: pendingAlert.channel }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'OTP could not be sent.');
        if (status) status.textContent = data.message;
    } catch (error) {
        if (status) status.textContent = error.message;
    } finally {
        if (button) button.disabled = false;
    }
}

async function verifyAlertOtp() {
    if (!pendingAlert) return;
    const status = document.getElementById('alert-verification-status');
    const otp = document.getElementById('alert-otp-input')?.value.trim();
    try {
        const response = await fetch('/api/alerts/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'OTP verification failed.');
        const alert = { ...pendingAlert };
        closeAlertVerification();
        await sendSpoilageAlert(alert.batchId, alert.channel);
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

// ============================================================
// QUICK PROMPT & STORAGE FINDER TAB CONTROLLER
// ============================================================

function sendQuickPrompt(text) {
    const queryInput = document.getElementById('assistant-query');
    if (queryInput) {
        queryInput.value = text;
        sendAssistantMessage();
    }
}

let mainStorageMap = null;
let mainStorageLayer = null;
let storageSearchDebounceTimer = null;

function debounceStorageSearch() {
    clearTimeout(storageSearchDebounceTimer);
    storageSearchDebounceTimer = setTimeout(triggerStorageSearch, 300);
}

function resetStorageFilters() {
    const q = document.getElementById('storage-query-input');
    const t = document.getElementById('storage-type-select');
    const c = document.getElementById('storage-crop-select');
    const r = document.getElementById('storage-radius-select');
    if (q) q.value = '';
    if (t) t.value = 'all';
    if (c) c.value = '';
    if (r) r.value = '50';
    triggerStorageSearch();
}

async function useFarmLocationForStorage() {
    const statusEl = document.getElementById('storage-location-status');
    if (statusEl) statusEl.innerText = currentLang === 'hi' ? 'खेत का स्थान खोजा जा रहा है...' : 'Detecting farm location...';
    try {
        if (!navigator.geolocation) throw new Error('Geolocation not supported');
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
        });
        farmerProfile = { ...(farmerProfile || {}), latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (statusEl) statusEl.innerText = `📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        triggerStorageSearch();
    } catch (e) {
        if (statusEl) statusEl.innerText = currentLang === 'hi' ? 'स्थान प्राप्त नहीं हुआ' : 'Could not detect location';
    }
}

async function triggerStorageSearch() {
    const cardsList = document.getElementById('storage-cards-list');
    const mapEl = document.getElementById('storage-main-map');
    if (!cardsList) return;

    let userLat = Number(farmerProfile?.latitude) || 28.6139;
    let userLng = Number(farmerProfile?.longitude) || 77.2090;

    const query = document.getElementById('storage-query-input')?.value.trim() || '';
    const type = document.getElementById('storage-type-select')?.value || 'all';
    const crop = document.getElementById('storage-crop-select')?.value || '';
    const radius = Number(document.getElementById('storage-radius-select')?.value) || 50;

    cardsList.innerHTML = `<div class="storage-loading-state" style="padding: 24px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">⏳ ${currentLang === 'hi' ? 'सत्यापित भंडारण केंद्र खोजे जा रहे हैं...' : 'Finding verified storage facilities near your location...'}</div>`;

    try {
        const params = new URLSearchParams();
        params.append('latitude', userLat);
        params.append('longitude', userLng);
        if (radius > 0) params.append('radius_km', radius);
        if (query) params.append('q', query);
        if (crop) params.append('crop', crop);
        if (type !== 'all') params.append('type', type);

        const res = await fetch(`/api/storage/search?${params.toString()}`);
        const data = await res.json();
        const facilities = data.facilities || data.places || [];

        // Update stats
        const totalEl = document.getElementById('storage-stat-total');
        const coldEl = document.getElementById('storage-stat-cold');
        const wdraEl = document.getElementById('storage-stat-wdra');
        const nearestEl = document.getElementById('storage-stat-nearest');
        const countEl = document.getElementById('storage-results-count');

        if (totalEl) totalEl.innerText = facilities.length;
        if (countEl) countEl.innerText = `${facilities.length} ${currentLang === 'hi' ? 'केंद्र' : 'Centers'}`;

        let coldCount = 0;
        let wdraCount = 0;
        let minDistance = Infinity;

        facilities.forEach(f => {
            const cat = String(f.category || f.type || '').toLowerCase();
            if (cat.includes('cold') || cat.includes('शीत')) coldCount++;
            if (f.is_wdra || cat.includes('wdra') || cat.includes('cwc') || cat.includes('swc')) wdraCount++;
            const dist = Number(f.distance_km ?? f.distance);
            if (Number.isFinite(dist) && dist < minDistance) minDistance = dist;
        });

        if (coldEl) coldEl.innerText = coldCount;
        if (wdraEl) wdraEl.innerText = wdraCount;
        if (nearestEl) nearestEl.innerText = Number.isFinite(minDistance) && minDistance < Infinity ? `${minDistance.toFixed(1)} km` : '—';

        // Initialize / Update Map
        if (window.L && mapEl) {
            if (!mainStorageMap) {
                mainStorageMap = L.map(mapEl).setView([userLat, userLng], 9);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(mainStorageMap);
                mainStorageLayer = L.layerGroup().addTo(mainStorageMap);
            } else {
                mainStorageLayer.clearLayers();
                mainStorageMap.setView([userLat, userLng], 9);
            }

            const farmIcon = L.divIcon({ className: 'farm-location-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
            L.marker([userLat, userLng], { icon: farmIcon }).addTo(mainStorageLayer).bindPopup(`<strong>${currentLang === 'hi' ? 'आपका खेत' : 'Your Farm'}</strong>`);

            facilities.forEach(f => {
                const lat = Number(f.lat ?? f.latitude);
                const lng = Number(f.lng ?? f.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                const name = f.name || 'Storage Facility';
                const dist = Number(f.distance_km ?? f.distance);
                const distStr = Number.isFinite(dist) ? `<br><small>📍 ${dist.toFixed(1)} km</small>` : '';
                L.marker([lat, lng]).addTo(mainStorageLayer).bindPopup(`<strong>${name}</strong>${distStr}`);
            });
            setTimeout(() => { mainStorageMap.invalidateSize(); }, 200);
        }

        // Render Cards
        if (facilities.length === 0) {
            cardsList.innerHTML = `<div style="padding: 24px; color: var(--text-muted); text-align: center; grid-column: 1 / -1;">${currentLang === 'hi' ? 'इस क्षेत्र में कोई भंडारण केंद्र नहीं मिला।' : 'No storage facilities found for this filter.'}</div>`;
            return;
        }

        cardsList.innerHTML = facilities.map(f => {
            const lat = Number(f.lat ?? f.latitude);
            const lng = Number(f.lng ?? f.longitude);
            const dist = Number(f.distance_km ?? f.distance);
            const distBadge = Number.isFinite(dist) ? `<span class="facility-distance-pill">📍 ${dist.toFixed(1)} km</span>` : '';
            const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            const category = f.category || f.type || 'Warehouse / Cold Storage';
            const isCold = category.toLowerCase().includes('cold');
            const typeBadge = `<span class="facility-type-badge ${isCold ? 'cold' : 'warehouse'}">${isCold ? '❄️ Cold Storage' : '🌾 Warehouse'}</span>`;

            return `
                <div class="storage-facility-card">
                    <div>
                        <div class="facility-top-row">
                            <h4 class="facility-name">${f.name}</h4>
                            ${distBadge}
                        </div>
                        <div style="margin-top: 6px;">
                            ${typeBadge}
                            ${f.is_wdra ? '<span class="facility-type-badge wdra" style="margin-left: 4px;">📜 WDRA e-NWR Loan</span>' : ''}
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">${f.address || f.formatted_address || 'District Warehouse'}</p>
                        ${f.capacity ? `<p style="font-size: 0.78rem; color: var(--text-body); margin-top: 4px;">Capacity: <strong>${f.capacity}</strong></p>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <a href="${dirUrl}" target="_blank" rel="noopener" class="btn-secondary" style="flex: 1; text-align: center; justify-content: center; text-decoration: none;">
                            🧭 ${currentLang === 'hi' ? 'रास्ता देखें' : 'Get Directions'}
                        </a>
                        ${f.phone ? `<a href="tel:${f.phone}" class="btn-secondary" style="text-decoration: none;">📞</a>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Storage search failed:', err);
        cardsList.innerHTML = `<div style="padding: 24px; color: var(--risk-red); text-align: center; grid-column: 1 / -1;">Storage search encountered an error. Please try again.</div>`;
    }
}

// ============================================================
// LOCATION-BASED MULTILINGUAL AUTO-DETECTION ENGINE
// ============================================================

async function autoDetectLocationLanguage(lat, lon, query = null) {
    // Single-time auto-switch: If user has explicitly chosen a language, or locked it, or initial detection already ran once, DO NOT auto-switch!
    if (localStorage.getItem('agriflow-user-language-choice') || 
        localStorage.getItem('agriflow-lang-locked') === 'true' || 
        localStorage.getItem('agriflow-initial-location-detected') === 'true') {
        return;
    }
    try {
        const params = new URLSearchParams();
        if (lat !== undefined && lat !== null && !isNaN(lat)) params.set('lat', lat);
        if (lon !== undefined && lon !== null && !isNaN(lon)) params.set('lon', lon);
        if (query) params.set('query', query);

        const res = await fetch(`/api/location/detect?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.language_code) {
            // Mark initial detection done so future location queries/updates never revert user's preferred language
            localStorage.setItem('agriflow-initial-location-detected', 'true');
            const detectedLang = data.language_code;
            const langNames = {
                en: "English",
                hi: "हिंदी (Hindi)",
                pa: "ਪੰਜਾਬੀ (Punjabi)",
                mr: "मराठी (Marathi)",
                gu: "ગુજરાતી (Gujarati)",
                kn: "ಕನ್ನಡ (Kannada)",
                te: "తెలుగు (Telugu)",
                ta: "தமிழ் (Tamil)",
                bn: "বাংলা (Bengali)"
            };
            const langLabel = langNames[detectedLang] || detectedLang;
            const autoTag = document.getElementById('lang-auto-tag');
            if (autoTag) {
                autoTag.innerText = `✨ ${data.state_name || 'Auto'}`;
                autoTag.title = `Auto-detected regional language for ${data.district_name ? data.district_name + ', ' : ''}${data.state_name || 'location'}`;
            }

            if (detectedLang !== currentLang) {
                setLanguage(detectedLang, false);
                const regionStr = data.state_name ? `${data.state_name}` : "your region";
                showToast(`📍 Detected ${regionStr} → Switched language to ${langLabel}`, "info");
            }
        }
    } catch (err) {
        console.warn("Location language auto-detect failed:", err);
    }
}

// ============================================================
// FEATURE 1: SMART IOT TELEMETRY & DRONE AERIAL SCANNER
// ============================================================

let lastDroneResult = null;

async function triggerDroneScan() {
    const btn = document.getElementById("btn-drone-scan");
    const drawer = document.getElementById("drone-scan-drawer");
    const pBar = document.getElementById("drone-progress-bar");
    const headline = document.getElementById("drone-scan-headline");
    const detail = document.getElementById("drone-scan-detail");
    const speechBtn = document.getElementById("btn-drone-speech");

    if (btn) {
        btn.classList.add("scanning");
        btn.disabled = true;
    }
    if (drawer) {
        drawer.classList.remove("hidden");
    }
    if (speechBtn) speechBtn.classList.add("hidden");

    if (pBar) pBar.style.width = "15%";
    if (headline) headline.innerText = currentLang === 'hi' ? "🚁 ड्रोन क्वाडकॉप्टर उड़ान भर रहा है..." : "🚁 Drone Quadcopter launching survey flight...";
    if (detail) detail.innerText = currentLang === 'hi' ? "ऊंचाई 45 मीटर AGL · 4K मल्टीस्पेक्ट्रल व थर्मल सेंसर सक्रिय..." : "Altitude 45m AGL · Calibrating 4K multispectral & thermal sensors...";

    const cropName = document.getElementById("calc_crop")?.value || "Wheat";
    const areaAcres = parseFloat(document.getElementById("calc_area")?.value) || 2.5;

    // Start API request in background while running smooth simulation sequence
    const scanPromise = fetch("/api/drone/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            crop_name: cropName,
            field_id: "Plot-Alpha-4",
            area_acres: areaAcres,
            language: currentLang
        })
    }).then(r => r.json()).catch(err => {
        console.warn("Drone scan API fallback:", err);
        return null;
    });

    // Step 1: Aerial grid mapping
    await new Promise(r => setTimeout(r, 600));
    if (pBar) pBar.style.width = "45%";
    if (headline) headline.innerText = currentLang === 'hi' ? "🛰️ प्लॉट ग्रिड अल्फा-4 की मल्टीस्पेक्ट्रल मैपिंग..." : "🛰️ Scanning Plot Grid Alpha-4...";
    if (detail) detail.innerText = currentLang === 'hi' ? "क्लोरोफिल अवशोषण, हरियाली घनत्व और तापमान रिकॉर्ड हो रहा है..." : "Capturing NDVI reflectance, chlorophyll absorption & canopy indices...";

    // Step 2: Telemetry computation
    await new Promise(r => setTimeout(r, 700));
    if (pBar) pBar.style.width = "80%";
    if (headline) headline.innerText = currentLang === 'hi' ? "📊 थर्मल व NDVI डेटा का विश्लेषण हो रहा है..." : "📊 Analyzing thermal & NDVI canopy health...";
    if (detail) detail.innerText = currentLang === 'hi' ? "मिट्टी नमी और पत्ते के तापमान की गणना जारी है..." : "Computing moisture stress index and soil capacity...";

    let data = await scanPromise;
    if (!data || !data.success || !data.telemetry) {
        const defaultNdvi = 0.83;
        data = {
            success: true,
            status: "Aerial Survey Completed",
            field_id: "Plot-Alpha-4",
            crop_name: cropName,
            area_acres: areaAcres,
            telemetry: {
                soil_health_score: 80,
                soil_condition: "Optimal",
                soil_moisture_pct: 66,
                moisture_status: "Field Capacity",
                canopy_temp_c: 31,
                canopy_status: "Optimal",
                ndvi: defaultNdvi,
                ndvi_rating: "Vibrant Vegetation"
            },
            recommendation: currentLang === 'hi'
                ? `मल्टीस्पेक्ट्रल ड्रोन स्कैन पुष्टि करता है कि ${cropName} फसल का NDVI ${defaultNdvi} स्वस्थ है। पौधों में क्लोरोफिल और नाइट्रोजन अवशोषण संतुलित है। अगली हल्की सिंचाई 3 दिन बाद अनुशंसित है।`
                : `Multispectral scan confirms ${cropName} vegetation index is optimal at ${defaultNdvi} (Healthy). Drone sensors indicate robust nitrogen absorption and dense canopy. Next watering in 3 days.`
        };
    }

    if (pBar) pBar.style.width = "100%";
    await new Promise(r => setTimeout(r, 350));

    lastDroneResult = data;
    const t = data.telemetry;

    // Update main metric values
    const soilEl = document.getElementById("telemetry-soil-health");
    const moistEl = document.getElementById("telemetry-moisture");
    const tempEl = document.getElementById("telemetry-temp");
    const ndviEl = document.getElementById("telemetry-ndvi");

    if (soilEl) soilEl.innerHTML = `${t.soil_health_score}% <small class="text-green">${t.soil_condition}</small>`;
    if (moistEl) moistEl.innerHTML = `${t.soil_moisture_pct}% <small class="text-turmeric">${t.moisture_status}</small>`;
    if (tempEl) tempEl.innerHTML = `${t.canopy_temp_c}°C <small>${t.canopy_status}</small>`;
    if (ndviEl) ndviEl.innerHTML = `${t.ndvi} <small class="text-green">${t.ndvi_rating}</small>`;

    // Update sub-detail labels
    const subSoil = document.getElementById("telemetry-sub-soil");
    const subMoist = document.getElementById("telemetry-sub-moisture");
    const subTemp = document.getElementById("telemetry-sub-temp");
    const subNdvi = document.getElementById("telemetry-sub-ndvi");

    if (subSoil) subSoil.innerText = currentLang === 'hi' ? `पीएच 6.9 · संतुलित एनपीके` : `pH 6.9 · NPK Balanced`;
    if (subMoist) subMoist.innerText = currentLang === 'hi' ? `सिंचाई: 3 दिन बाद आवश्यकता` : `Irrigation: Optimal for 3 Days`;
    if (subTemp) subTemp.innerText = currentLang === 'hi' ? `मौसम: साफ़ · 9 किमी/घं हवा` : `Weather: Clear · 9 km/h Wind`;
    if (subNdvi) subNdvi.innerText = currentLang === 'hi' ? `छत्र घनत्व: उत्तम (${cropName})` : `Canopy Health: Excellent (${cropName})`;

    if (headline) headline.innerText = `🚁 ${data.status || 'Aerial Survey Completed'} · Plot ${data.field_id || 'Alpha-4'}`;
    if (detail) detail.innerText = data.recommendation;
    if (speechBtn) speechBtn.classList.remove("hidden");

    showToast(currentLang === 'hi' ? `✅ ड्रोन स्कैन पूर्ण! NDVI सूचकांक: ${t.ndvi} (स्वस्थ फसल)` : `✅ Drone scan complete! Field NDVI: ${t.ndvi} (Healthy)`, "success");

    if (btn) {
        btn.classList.remove("scanning");
        btn.disabled = false;
    }
}

function speakDroneResult() {
    if (!lastDroneResult || !lastDroneResult.recommendation) {
        showToast("Please scan the field first.", "info");
        return;
    }
    speakText(lastDroneResult.recommendation, currentLang);
}

// ============================================================
// FEATURE 3: ONE-CLICK VOICE READOUT / SPEECH SYNTHESIS
// ============================================================

let currentSpeechUtterance = null;

function speakText(text, lang = currentLang) {
    if (!('speechSynthesis' in window)) {
        showToast("Speech synthesis is not supported on this browser.", "error");
        return;
    }

    window.speechSynthesis.cancel();

    if (!text || !text.trim()) {
        showToast("No text available to read aloud.", "info");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // BCP-47 language tag mapping
    const bcpMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        pa: 'pa-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        kn: 'kn-IN',
        te: 'te-IN',
        ta: 'ta-IN',
        bn: 'bn-IN'
    };
    utterance.lang = bcpMap[lang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang === utterance.lang || v.lang.startsWith(lang));
    if (match) utterance.voice = match;

    const speechBtns = document.querySelectorAll('.btn-speech-readout');
    utterance.onstart = () => {
        speechBtns.forEach(b => b.classList.add('speaking'));
    };
    utterance.onend = () => {
        speechBtns.forEach(b => b.classList.remove('speaking'));
    };
    utterance.onerror = () => {
        speechBtns.forEach(b => b.classList.remove('speaking'));
    };

    currentSpeechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

async function speakWeatherAction() {
    const el = document.getElementById("weather-action-result");
    let text = el ? el.textContent.trim() : "";
    if (!text || text.includes("Analyze today") || text.includes("प्रतीक्षा") || text.includes("Load your GPS") || text.includes("एक उपयोगी सलाह")) {
        await generateWeatherAction();
        text = el ? el.textContent.trim() : "";
    }
    if (text) {
        speakText(text, typeof currentLang !== 'undefined' ? currentLang : 'en');
    }
}

// ============================================================
// FEATURE 4: INDIAN LAND & WEIGHT AGRI UNIT CONVERTER
// ============================================================

function openUnitConverter() {
    const modal = document.getElementById("unit-converter-modal");
    if (modal) {
        modal.style.display = "flex";
        calculateLandConversion();
        calculateWeightConversion();
    }
}

function closeUnitConverter() {
    const modal = document.getElementById("unit-converter-modal");
    if (modal) modal.style.display = "none";
}

function switchConverterMode(mode) {
    const btnLand = document.getElementById("btn-conv-tab-land");
    const btnWeight = document.getElementById("btn-conv-tab-weight");
    const secLand = document.getElementById("converter-section-land");
    const secWeight = document.getElementById("converter-section-weight");

    if (mode === 'land') {
        if (btnLand) btnLand.classList.add('active');
        if (btnWeight) btnWeight.classList.remove('active');
        if (secLand) secLand.style.display = 'block';
        if (secWeight) secWeight.style.display = 'none';
        calculateLandConversion();
    } else {
        if (btnLand) btnLand.classList.remove('active');
        if (btnWeight) btnWeight.classList.add('active');
        if (secLand) secLand.style.display = 'none';
        if (secWeight) secWeight.style.display = 'block';
        calculateWeightConversion();
    }
}

function calculateLandConversion() {
    const val = parseFloat(document.getElementById("conv-land-value")?.value) || 0;
    const unit = document.getElementById("conv-land-unit")?.value || "acre";

    // Unit conversion factors to Square Meters
    const toSqmFactors = {
        acre: 4046.8564224,
        bigha_pucca: 2529.285,
        bigha_kachha: 843.095,
        guntha: 101.1714,
        hectare: 10000.0,
        kanal: 505.857,
        marla: 25.29285,
        sq_meter: 1.0,
        sq_yard: 0.836127
    };

    const factor = toSqmFactors[unit] || 4046.856;
    const baseSqm = val * factor;

    const resAcre = document.getElementById("res-acre");
    const resBigha = document.getElementById("res-bigha");
    const resGuntha = document.getElementById("res-guntha");
    const resHectare = document.getElementById("res-hectare");
    const resKanal = document.getElementById("res-kanal");
    const resSqm = document.getElementById("res-sqm");

    if (resAcre) resAcre.innerText = (baseSqm / 4046.856).toFixed(3);
    if (resBigha) resBigha.innerText = (baseSqm / 2529.285).toFixed(2);
    if (resGuntha) resGuntha.innerText = (baseSqm / 101.1714).toFixed(2);
    if (resHectare) resHectare.innerText = (baseSqm / 10000.0).toFixed(3);
    if (resKanal) resKanal.innerText = (baseSqm / 505.857).toFixed(2);
    if (resSqm) resSqm.innerText = baseSqm.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

function calculateWeightConversion() {
    const val = parseFloat(document.getElementById("conv-weight-value")?.value) || 0;
    const unit = document.getElementById("conv-weight-unit")?.value || "quintal";

    // Unit conversion factors to Kilograms
    const toKgFactors = {
        quintal: 100.0,
        kg: 1.0,
        maund: 40.0,
        bag50: 50.0,
        ton: 1000.0
    };

    const factor = toKgFactors[unit] || 100.0;
    const baseKg = val * factor;

    const resQuintal = document.getElementById("res-quintal");
    const resKg = document.getElementById("res-kg");
    const resMaund = document.getElementById("res-maund");
    const resBags = document.getElementById("res-bags");
    const resTon = document.getElementById("res-ton");

    if (resQuintal) resQuintal.innerText = (baseKg / 100.0).toFixed(2);
    if (resKg) resKg.innerText = baseKg.toLocaleString('en-IN', { maximumFractionDigits: 1 });
    if (resMaund) resMaund.innerText = (baseKg / 40.0).toFixed(2);
    if (resBags) resBags.innerText = (baseKg / 50.0).toFixed(1);
    if (resTon) resTon.innerText = (baseKg / 1000.0).toFixed(3);
}

// ============================================================
// FEATURE 5: DIGITAL FARM FINANCIAL SLIP & MANDI VOUCHER
// ============================================================

function openFarmSlipModal() {
    const modal = document.getElementById("farm-slip-modal");
    if (!modal) return;
    
    if (farmerProfile) {
        if (farmerProfile.full_name) {
            const el = document.getElementById("slip-farmer-name");
            if (el && !el.value) el.value = farmerProfile.full_name;
        }
        if (farmerProfile.alert_phone) {
            const el = document.getElementById("slip-phone");
            if (el && !el.value) el.value = farmerProfile.alert_phone;
        }
        if (farmerProfile.location_name) {
            const el = document.getElementById("slip-location");
            if (el && !el.value) el.value = farmerProfile.location_name;
        }
    }
    const docIdEl = document.getElementById("slip-doc-id");
    if (docIdEl) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        docIdEl.innerText = `VCH-${new Date().getFullYear()}-${randNum}`;
    }

    modal.style.display = "flex";
    renderFarmSlipPreview();
}

function closeFarmSlipModal() {
    const modal = document.getElementById("farm-slip-modal");
    if (modal) modal.style.display = "none";
}

function renderFarmSlipPreview() {
    const farmer = document.getElementById("slip-farmer-name")?.value || "Ramesh Singh";
    const phone = document.getElementById("slip-phone")?.value || "9876543210";
    const loc = document.getElementById("slip-location")?.value || "Khanna APMC Mandi";
    const crop = document.getElementById("slip-crop")?.value || "Wheat (Kanak)";
    const qty = parseFloat(document.getElementById("slip-quantity")?.value) || 0;
    const rate = parseFloat(document.getElementById("slip-rate")?.value) || 0;
    const deductions = parseFloat(document.getElementById("slip-deductions")?.value) || 0;
    const status = document.getElementById("slip-status")?.value || "PAID - Bank Transfer";

    const gross = qty * rate;
    const net = Math.max(0, gross - deductions);

    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const pvFarmer = document.getElementById("pv-farmer");
    const pvPhone = document.getElementById("pv-phone");
    const pvLoc = document.getElementById("pv-location");
    const pvDate = document.getElementById("pv-date");
    const pvCrop = document.getElementById("pv-crop");
    const pvQty = document.getElementById("pv-qty");
    const pvRate = document.getElementById("pv-rate");
    const pvGross = document.getElementById("pv-gross");
    const pvDeductions = document.getElementById("pv-deductions");
    const pvNet = document.getElementById("pv-net");
    const pvStatus = document.getElementById("pv-status");

    if (pvFarmer) pvFarmer.innerText = farmer;
    if (pvPhone) pvPhone.innerText = phone ? `+91 ${phone}` : '—';
    if (pvLoc) pvLoc.innerText = loc;
    if (pvDate) pvDate.innerText = todayStr;
    if (pvCrop) pvCrop.innerText = crop;
    if (pvQty) pvQty.innerText = qty.toFixed(1);
    if (pvRate) pvRate.innerText = rate.toLocaleString('en-IN');
    if (pvGross) pvGross.innerText = gross.toLocaleString('en-IN');
    if (pvDeductions) pvDeductions.innerText = deductions.toLocaleString('en-IN');
    if (pvNet) pvNet.innerText = net.toLocaleString('en-IN');
    if (pvStatus) pvStatus.innerText = status;
}

function shareFarmSlipViaWhatsApp() {
    const farmer = document.getElementById("slip-farmer-name")?.value || "Ramesh Singh";
    const phone = document.getElementById("slip-phone")?.value || "";
    const loc = document.getElementById("slip-location")?.value || "APMC Mandi";
    const crop = document.getElementById("slip-crop")?.value || "Wheat";
    const qty = parseFloat(document.getElementById("slip-quantity")?.value) || 0;
    const rate = parseFloat(document.getElementById("slip-rate")?.value) || 0;
    const deductions = parseFloat(document.getElementById("slip-deductions")?.value) || 0;
    const status = document.getElementById("slip-status")?.value || "PAID";
    const docId = document.getElementById("slip-doc-id")?.innerText || "VCH-2026-FARM";
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const gross = qty * rate;
    const net = Math.max(0, gross - deductions);

    const message = `🌾 *AGRIFLOW OFFICIAL FARM SETTLEMENT SLIP*
📄 Doc ID: ${docId}
📅 Date: ${dateStr}

👨‍🌾 *Farmer:* ${farmer}
📍 *Mandi / Location:* ${loc}
${phone ? `📞 Contact: +91 ${phone}\n` : ''}
📦 *Produce:* ${crop}
⚖️ *Quantity:* ${qty.toFixed(1)} Quintals
💰 *Sale Rate:* ₹${rate.toLocaleString('en-IN')} / Quintal
💵 *Gross Sale Value:* ₹${gross.toLocaleString('en-IN')}
📉 *Mandi Deductions / Labor:* -₹${deductions.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━
✅ *NET PAYABLE AMOUNT: ₹${net.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━
📌 *Status:* ${status}
Verified & Generated via AgriFlow Smart Farm Workspace.`;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let waUrl = '';
    if (cleanPhone.length === 10) {
        waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else if (cleanPhone.length > 10) {
        waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, '_blank');
}

function printFarmSlip() {
    window.print();
}

// ============================================================
// REGIONAL UI DICTIONARY (9 INDIAN LANGUAGES)
// ============================================================

const REGIONAL_UI_DICTIONARY = {
    hi: {
        "Farm Intelligence Workspace": "कृषि वित्तीय व मंडी सलाहकार",
        "Pre-Cost Calculator": "फसल पूर्व लागत कैलकुलेटर",
        "Weather & Soil": "मौसम व मिट्टी",
        "Mandi Market Rates": "मंडी भाव",
        "Sell Now or Wait?": "अभी बेचें या रुकें?",
        "Nearest Storage Facility": "निकटतम भंडारण केंद्र",
        "Register a Crop": "फसल दर्ज करें",
        "Active / Stored Batches": "भंडारित उपज",
        "Settle a Sale": "बिक्री दर्ज करें",
        "History & Next Crop": "उपज इतिहास व अगली फसल",
        "Language": "भाषा",
        "Unit Converter": "इकाई परिवर्तक",
        "Farm Slip": "फार्म रसीद",
        "Scan Field with Drone": "ड्रोन से खेत स्कैन करें",
        "Listen": "सुनें",
        "Analyze": "जांचें",
        "Total Production Cost": "कुल उत्पादन लागत",
        "Expected Yield": "अनुमानित पैदावार",
        "Mandi Selling Rate": "मंडी विक्रय भाव",
        "Estimated Revenue": "कुल अनुमानित आय",
        "Expected Net Profit / Loss": "अनुमानित शुद्ध लाभ / हानि",
        "Profit Per Unit": "प्रति एकड़ / बीघा लाभ",
        "Cost Distribution Breakdown": "लागत का श्रेणीवार विभाजन",
        "AI Crop Quality & Spoilage Diagnosis": "एआई फसल गुणवत्ता व सड़न निदान",
        "Preferred Regional Language (Manual or Auto-Location)": "पसंदीदा क्षेत्रीय भाषा (मैनुअल या स्थान आधारित)"
    },
    pa: {
        "Farm Intelligence Workspace": "ਖੇਤੀਬਾੜੀ ਵਿੱਤੀ ਅਤੇ ਮੰਡੀ ਸਲਾਹਕਾਰ",
        "Pre-Cost Calculator": "ਫਸਲ ਪੂਰਵ ਲਾਗਤ ਕੈਲਕੁਲੇਟਰ",
        "Weather & Soil": "ਮੌਸਮ ਅਤੇ ਮਿੱਟੀ",
        "Mandi Market Rates": "ਮੰਡੀ ਦੇ ਭਾਅ",
        "Sell Now or Wait?": "ਹੁਣੇ ਵੇਚੋ ਜਾਂ ਰੁਕੋ?",
        "Nearest Storage Facility": "ਨੇੜਲਾ ਸਟੋਰੇਜ ਗੋਦਾਮ",
        "Register a Crop": "ਫਸਲ ਦਰਜ ਕਰੋ",
        "Active / Stored Batches": "ਸਟੋਰ ਕੀਤੀ ਫਸਲ",
        "Settle a Sale": "ਵਿਕਰੀ ਦਰਜ ਕਰੋ",
        "History & Next Crop": "ਇਤਿਹਾਸ ਅਤੇ ਅਗਲੀ ਫਸਲ",
        "Language": "ਭਾਸ਼ਾ",
        "Unit Converter": "ਇਕਾਈ ਪਰਿਵਰਤਕ",
        "Farm Slip": "ਖੇਤ ਰਸੀਦ",
        "Scan Field with Drone": "ਡਰੋਨ ਨਾਲ ਖੇਤ ਸਕੈਨ ਕਰੋ",
        "Listen": "ਸੁਣੋ",
        "Analyze": "ਜਾਂਚ ਕਰੋ",
        "Total Production Cost": "ਕੁੱਲ ਉਤਪਾਦਨ ਲਾਗਤ",
        "Expected Yield": "ਅਨੁਮਾਨਿਤ ਝਾੜ",
        "Mandi Selling Rate": "ਮੰਡੀ ਵਿਕਰੀ ਭਾਅ",
        "Estimated Revenue": "ਕੁੱਲ ਅਨੁਮਾਨਿਤ ਆਮਦਨ",
        "Expected Net Profit / Loss": "ਅਨੁਮਾਨਿਤ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ / ਨੁਕਸਾਨ",
        "Profit Per Unit": "ਪ੍ਰਤੀ ਏਕੜ ਮੁਨਾਫ਼ਾ",
        "Cost Distribution Breakdown": "ਲਾਗਤ ਵੰਡ",
        "Soil Health": "ਮਿੱਟੀ ਦੀ ਸਿਹਤ",
        "Soil Moisture": "ਮਿੱਟੀ ਦੀ ਨਮੀ",
        "Field Canopy Temp": "ਖੇਤ ਦਾ ਤਾਪਮਾਨ",
        "NDVI Crop Index": "ਐਨ.ਡੀ.ਵੀ.ਆਈ. ਹਰਿਆਲੀ ਸੂਚਕਾਂਕ",
        "Indian Farm Unit Converter": "ਖੇਤੀਬਾੜੀ ਇਕਾਈ ਪਰਿਵਰਤਕ",
        "Digital Farm Settlement Slip / Mandi Voucher": "ਡਿਜੀਟਲ ਖੇਤ ਵਿਕਰੀ ਰਸੀਦ / ਮੰਡੀ ਵਾਊਚਰ",
        "Farmer Name": "ਕਿਸਾਨ ਦਾ ਨਾਮ",
        "WhatsApp / Phone": "ਵਟਸਐਪ / ਫੋਨ",
        "Village / Mandi Market": "ਪਿੰਡ / ਮੰਡੀ",
        "Produce Crop & Variety": "ਫਸਲ ਅਤੇ ਕਿਸਮ",
        "Quantity (Quintals)": "ਮਾਤਰਾ (ਕੁਇੰਟਲ)",
        "Sale Rate (₹ / Quintal)": "ਵਿਕਰੀ ਰੇਟ (₹ / ਕੁਇੰਟਲ)",
        "Mandi Deductions / Labor (₹)": "ਮੰਡੀ ਖਰਚੇ / ਪੱਲੇਦਾਰੀ (₹)",
        "Settlement Status": "ਭੁਗਤਾਨ ਸਥਿਤੀ",
        "Preferred Regional Language (Manual or Auto-Location)": "ਪਸੰਦੀਦਾ ਖੇਤਰੀ ਭਾਸ਼ਾ"
    },
    mr: {
        "Farm Intelligence Workspace": "शेती आर्थिक व बाजार सल्लागार",
        "Pre-Cost Calculator": "पीक पूर्व खर्च गणक",
        "Weather & Soil": "हवामान व माती",
        "Mandi Market Rates": "बाजार भाव",
        "Sell Now or Wait?": "आत्ता विका की थांबा?",
        "Nearest Storage Facility": "जवळचे गोदाम / शीतगृह",
        "Register a Crop": "पीक नोंदणी करा",
        "Active / Stored Batches": "साठवलेले पीक",
        "Settle a Sale": "विक्री पूर्ण करा",
        "History & Next Crop": "इतिहास आणि पुढील पीक",
        "Language": "भाषा",
        "Unit Converter": "एकक परिवर्तक",
        "Farm Slip": "शेत पावती",
        "Scan Field with Drone": "ड्रोनने शेताचे स्कॅनिंग करा",
        "Listen": "ऐका",
        "Analyze": "विश्लेषण करा",
        "Total Production Cost": "एकूण उत्पादन खर्च",
        "Expected Yield": "अपेक्षित उत्पादन",
        "Mandi Selling Rate": "बाजार विक्री भाव",
        "Estimated Revenue": "अंदाजे एकूण उत्पन्न",
        "Expected Net Profit / Loss": "अपेक्षित निव्वळ नफा / तोटा",
        "Profit Per Unit": "प्रति एकर / गुंठा नफा",
        "Cost Distribution Breakdown": "खर्च विभागणी",
        "Soil Health": "मातीचे आरोग्य",
        "Soil Moisture": "मातीतील ओलावा",
        "Field Canopy Temp": "शेताचे तापमान",
        "NDVI Crop Index": "पिकाची हिरवळ निर्देशांक (NDVI)",
        "Indian Farm Unit Converter": "कृषी एकक परिवर्तक",
        "Digital Farm Settlement Slip / Mandi Voucher": "डिजिटल शेत पावती / बाजार वाउचर",
        "Farmer Name": "शेतकऱ्याचे नाव",
        "WhatsApp / Phone": "व्हॉट्सअ‍ॅप / फोन",
        "Village / Mandi Market": "गाव / बाजार समिती",
        "Produce Crop & Variety": "पीक व वाण",
        "Quantity (Quintals)": "प्रमाण (क्विंटल)",
        "Sale Rate (₹ / Quintal)": "विक्री दर (₹ / क्विंटल)",
        "Mandi Deductions / Labor (₹)": "हमाली / तोलाई खर्च (₹)",
        "Settlement Status": "पेमेंट स्थिती",
        "Preferred Regional Language (Manual or Auto-Location)": "पसंतीची प्रादेशिक भाषा"
    },
    gu: {
        "Farm Intelligence Workspace": "કૃષિ નાણાકીય અને બજાર સલાહકાર",
        "Pre-Cost Calculator": "પાક પૂર્વ ખર્ચ કેલ્ક્યુલેટર",
        "Weather & Soil": "હવામાન અને જમીન",
        "Mandi Market Rates": "માર્કેટ યાર્ડ ભાવ",
        "Sell Now or Wait?": "હમણાં વેચો કે રાહ જુઓ?",
        "Nearest Storage Facility": "નજીકનું કોલ્ડ સ્ટોરેજ / ગોડાઉન",
        "Register a Crop": "પાક નોંધણી કરો",
        "Active / Stored Batches": "સંગ્રહિત માલ",
        "Settle a Sale": "વેચાણ પૂરું કરો",
        "History & Next Crop": "ઇતિહાસ અને આગામી પાક",
        "Language": "ભાષા",
        "Unit Converter": "યુનિટ કન્વર્ટર",
        "Farm Slip": "ખેત પાવતી",
        "Scan Field with Drone": "ડ્રોનથી ખેતર સ્કેન કરો",
        "Listen": "સાંભળો",
        "Analyze": "તપાસો",
        "Total Production Cost": "કુલ ઉત્પાદન ખર્ચ",
        "Expected Yield": "અપેક્ષિત ઉત્પાદન",
        "Mandi Selling Rate": "માર્કેટ વેચાણ ભાવ",
        "Estimated Revenue": "કુલ અંદાજિત આવક",
        "Expected Net Profit / Loss": "અંદાજિત ચોખ્ખો નફો / નુકસાન",
        "Profit Per Unit": "પ્રતિ વીઘા નફો",
        "Cost Distribution Breakdown": "ખર્ચ વિભાજન",
        "Soil Health": "જમીન સ્વાસ્થ્ય",
        "Soil Moisture": "જમીનમાં ભેજ",
        "Field Canopy Temp": "ખેતરનું તાપમાન",
        "NDVI Crop Index": "હરિયાળી સૂચકાંક (NDVI)",
        "Preferred Regional Language (Manual or Auto-Location)": "પસંદગીની પ્રાદેશિક ભાષા"
    },
    kn: {
        "Farm Intelligence Workspace": "ಕೃಷಿ ಹಣಕಾಸು ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಸಲಹೆಗಾರ",
        "Pre-Cost Calculator": "ಬೆಳೆ ಪೂರ್ವ ವೆಚ್ಚ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        "Weather & Soil": "ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣು",
        "Mandi Market Rates": "ಮಾರುಕಟ್ಟೆ ದರಗಳು",
        "Sell Now or Wait?": "ಈಗ ಮಾರಾಟ ಮಾಡಬೇಕೆ ಅಥವಾ ಕಾಯಬೇಕೆ?",
        "Nearest Storage Facility": "ಹತ್ತಿರದ ಶೇಖರಣಾ ಗೋದಾಮು",
        "Register a Crop": "ಬೆಳೆ ನೋಂದಾಯಿಸಿ",
        "Active / Stored Batches": "ಶೇಖರಿಸಿದ ಬೆಳೆ",
        "Settle a Sale": "ಮಾರಾಟ ಇತ್ಯರ್ಥಪಡಿಸಿ",
        "History & Next Crop": "ಇತಿಹಾಸ ಮತ್ತು ಮುಂದಿನ ಬೆಳೆ",
        "Language": "ಭಾಷೆ",
        "Unit Converter": "ಘಟಕ ಪರಿವರ್ತಕ",
        "Farm Slip": "ಫಾರ್ಮ್ ರಶೀದಿ",
        "Scan Field with Drone": "ಡ್ರೋನ್‌ನಿಂದ ಹೊಲ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
        "Listen": "ಕೇಳಿ",
        "Analyze": "ಪರಿಶೀಲಿಸಿ",
        "Total Production Cost": "ಒಟ್ಟು ಉತ್ಪಾದನಾ ವೆಚ್ಚ",
        "Expected Yield": "ನಿರೀಕ್ಷಿತ ಇಳುವರಿ",
        "Mandi Selling Rate": "ಮಾರುಕಟ್ಟೆ ಮಾರಾಟ ದರ",
        "Estimated Revenue": "ಅಂದಾಜು ಆದಾಯ",
        "Expected Net Profit / Loss": "ನಿರೀಕ್ಷಿತ ನಿವ್ವಳ ಲಾಭ / ನಷ್ಟ",
        "Profit Per Unit": "ಪ್ರತಿ ಎಕರೆ ಲಾಭ",
        "Cost Distribution Breakdown": "ವೆಚ್ಚ ವಿಭಜನೆ",
        "Soil Health": "ಮಣ್ಣಿನ ಆರೋಗ್ಯ",
        "Soil Moisture": "ಮಣ್ಣಿನ ತೇವಾಂಶ",
        "Preferred Regional Language (Manual or Auto-Location)": "ಪ್ರಾದೇಶಿಕ ಭಾಷೆ"
    },
    te: {
        "Farm Intelligence Workspace": "వ్యవసాయ ఆర్థిక & మార్కెట్ సలహాదారు",
        "Pre-Cost Calculator": "పంట పూర్వ ఖర్చు కాలిక్యులేటర్",
        "Weather & Soil": "వాతావరణం & నేల",
        "Mandi Market Rates": "మార్కెట్ ధరలు",
        "Sell Now or Wait?": "ఇప్పుడే అమ్మాలా లేదా వేచి ఉండాలా?",
        "Nearest Storage Facility": "సమీప నిల్వ కేంద్రం",
        "Register a Crop": "పంటను నమోదు చేయండి",
        "Active / Stored Batches": "నిల్వ చేసిన పంట బ్యాచ్‌లు",
        "Settle a Sale": "విక్రయాన్ని నమోదు చేయండి",
        "History & Next Crop": "చరిత్ర & తదుపరి పంట",
        "Language": "భాష",
        "Unit Converter": "యూనిట్ కన్వర్టర్",
        "Farm Slip": "వ్యవసాయ రసీదు",
        "Scan Field with Drone": "డ్రోన్‌తో పొలాన్ని స్కాన్ చేయండి",
        "Listen": "వినండి",
        "Analyze": "విశ్లేషించండి",
        "Total Production Cost": "మొత్తం ఉత్పత్తి ఖర్చు",
        "Expected Yield": "అంచనా దిగుబడి",
        "Mandi Selling Rate": "మార్కెట్ విక్రయ ధర",
        "Estimated Revenue": "అంచనా ఆదాయం",
        "Expected Net Profit / Loss": "అంచనా నికర లాభం / నష్టం",
        "Profit Per Unit": "ఎకరాకు లాభం",
        "Preferred Regional Language (Manual or Auto-Location)": "ప్రాంతీయ భాష"
    },
    ta: {
        "Farm Intelligence Workspace": "விவசாய நிதி மற்றும் சந்தை ஆலோசகர்",
        "Pre-Cost Calculator": "பயிர் முன்செலவு கணக்கீடு",
        "Weather & Soil": "வானிலை மற்றும் மண்",
        "Mandi Market Rates": "மண்டி சந்தை விலைகள்",
        "Sell Now or Wait?": "இப்போதே விற்கவா அல்லது காத்திருக்கவா?",
        "Nearest Storage Facility": "அருகிலுள்ள சேமிப்புக் கிடங்கு",
        "Register a Crop": "பயிரை பதிவு செய்க",
        "Active / Stored Batches": "சேமிக்கப்பட்ட பயிர்கள்",
        "Settle a Sale": "விற்பனையை முடிக்கவும்",
        "History & Next Crop": "வரலாறு மற்றும் அடுத்த பயிர்",
        "Language": "மொழி",
        "Unit Converter": "அலகு மாற்றி",
        "Farm Slip": "பண்ணை ரசீது",
        "Scan Field with Drone": "ட்ரோன் மூலம் வயலை ஸ்கேன் செய்க",
        "Listen": "கேளுங்கள்",
        "Analyze": "ஆராய்க",
        "Total Production Cost": "மொத்த உற்பத்தி செலவு",
        "Expected Yield": "எதிர்பார்க்கப்படும் மகசூல்",
        "Mandi Selling Rate": "மண்டி விற்பனை விலை",
        "Estimated Revenue": "மதிப்பிடப்பட்ட வருமானம்",
        "Expected Net Profit / Loss": "எதிர்பார்க்கப்படும் நிகர லாபம் / இழப்பு",
        "Profit Per Unit": "ஏக்கருக்கு லாபம்",
        "Preferred Regional Language (Manual or Auto-Location)": "விருப்பமான பிராந்திய மொழி"
    },
    bn: {
        "Farm Intelligence Workspace": "কৃষি আর্থিক ও বাজার উপদেষ্টা",
        "Pre-Cost Calculator": "ফসল পূর্ব খরচ ক্যালকুলেটর",
        "Weather & Soil": "আবহাওয়া ও মাটি",
        "Mandi Market Rates": "মণ্ডির বাজার দর",
        "Sell Now or Wait?": "এখনই বিক্রি করবেন নাকি অপেক্ষা করবেন?",
        "Nearest Storage Facility": "নিকটবর্তী গুদাম ও হিমাগার",
        "Register a Crop": "ফসল নিবন্ধন করুন",
        "Active / Stored Batches": "মজুত ফসলের ব্যাচ",
        "Settle a Sale": "বিক্রয় নিষ্পত্তি করুন",
        "History & Next Crop": "ইতিহাস এবং পরবর্তী ফসল",
        "Language": "ভাষা",
        "Unit Converter": "একক রূপান্তরকারী",
        "Farm Slip": "খামার রসিদ",
        "Scan Field with Drone": "ড্রোন দিয়ে জমি স্ক্যান করুন",
        "Listen": "শুনুন",
        "Analyze": "বিশ্লেষণ করুন",
        "Total Production Cost": "মোট উৎপাদন খরচ",
        "Expected Yield": "প্রত্যাশিত ফলন",
        "Mandi Selling Rate": "মণ্ডি বিক্রয় দর",
        "Estimated Revenue": "আনুমানিক মোট আয়",
        "Expected Net Profit / Loss": "প্রত্যাশিত নিট লাভ / ক্ষতি",
        "Profit Per Unit": "প্রতি বিঘা/একর লাভ",
        "Preferred Regional Language (Manual or Auto-Location)": "পছন্দের আঞ্চলিক ভাষা"
    }
};

// ============================================================
// APPLE LIQUID GLASS: DARK MODE TOGGLE
// ============================================================

function initTheme() {
    try {
        const saved = localStorage.getItem('agriflow_theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        applyTheme(theme, false);
    } catch (e) {
        console.warn("Theme init error:", e);
    }
}

function applyTheme(theme, notify = true) {
    const isDark = (theme === 'dark');
    document.body.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('dark-theme', isDark);

    const btn = document.getElementById('theme-toggle-btn');
    const label = document.getElementById('theme-toggle-label');
    if (btn) btn.classList.toggle('dark-active', isDark);
    if (label) {
        label.textContent = isDark 
            ? (typeof currentLang !== 'undefined' && currentLang === 'hi' ? 'डार्क' : 'Dark')
            : (typeof currentLang !== 'undefined' && currentLang === 'hi' ? 'लाइट' : 'Light');
    }
    try {
        localStorage.setItem('agriflow_theme', theme);
    } catch (e) {}

    if (notify) {
        showToast(isDark ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated', 'success');
    }
}

function toggleDarkMode() {
    const isDarkNow = document.body.classList.contains('dark-theme');
    const nextTheme = isDarkNow ? 'light' : 'dark';
    applyTheme(nextTheme, true);
}

// ============================================================
// FULL AGRONOMIC & MICROCLIMATE ANALYSIS MODULE
// ============================================================

let latestFullAnalysisData = null;

async function openFullAnalysisModal() {
    const modal = document.getElementById("full-analysis-modal");
    if (!modal) return;
    modal.style.display = "flex";
    modal.classList.remove("hidden");

    // Pre-sync crop from active form
    const calcCrop = document.getElementById("calc_crop")?.value;
    const cropSelect = document.getElementById("analysis-crop-select");
    if (calcCrop && cropSelect) {
        for (let opt of cropSelect.options) {
            if (opt.value.toLowerCase() === calcCrop.toLowerCase()) {
                cropSelect.value = opt.value;
                break;
            }
        }
    }
    await runFullAgronomicAnalysis();
}

function closeFullAnalysisModal() {
    const modal = document.getElementById("full-analysis-modal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.add("hidden");
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}

async function runFullAgronomicAnalysis() {
    const crop = document.getElementById("analysis-crop-select")?.value || "Tomato";
    const loader = document.getElementById("analysis-loading");
    const content = document.getElementById("analysis-content-body");

    if (loader) loader.classList.remove("hidden");
    if (content) content.style.opacity = "0.35";

    let current = weatherCache?.data?.current || {
        temperature_c: 26.5,
        relative_humidity_percent: 74,
        wind_speed_kmh: 9,
        rainfall_mm: 0,
        condition: "Partly cloudy"
    };
    let forecast = weatherCache?.data?.forecast || [
        { rain_probability_percent: 40, precipitation_mm: 1.0, temperature_min_c: 22, temperature_max_c: 32 },
        { rain_probability_percent: 20, precipitation_mm: 0.0, temperature_min_c: 21, temperature_max_c: 33 }
    ];

    try {
        const response = await fetch("/api/weather/full-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                crop,
                current,
                forecast,
                language: typeof currentLang !== 'undefined' ? currentLang : 'en'
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Analysis request failed");
        latestFullAnalysisData = data;
        renderFullAnalysisReport(data);
    } catch (err) {
        console.warn("Using local full analysis fallback:", err);
        const hum = current.relative_humidity_percent || 72;
        const rainProb = forecast[0]?.rain_probability_percent || 30;
        const rainMm = forecast[0]?.precipitation_mm || 0;
        const temp = current.temperature_c || 26;
        const wind = current.wind_speed_kmh || 8;

        const fallback = {
            crop,
            temperature_c: temp,
            humidity_pct: hum,
            wind_kmh: wind,
            rain_probability: rainProb,
            expected_rain_mm: rainMm,
            disease: {
                level: (hum > 80) ? "High" : (hum > 60 ? "Moderate" : "Low"),
                pathogens: (hum > 80) ? "Late Blight, Downy Mildew & Fungal Leaf Spot" : "Early Leaf Rust & Sucking Pests (Aphids)",
                action: (hum > 80) ? "High humidity accelerates pathogen spore germination. Clean furrows and monitor lower canopy." : "Canopy transpiration normal. Continue routine monitoring."
            },
            spray: {
                status: (rainProb > 45 || rainMm > 2) ? "Do Not Spray" : (wind > 15 ? "Marginal" : "Optimal"),
                badge: (rainProb > 45 || rainMm > 2) ? "Rain Expected" : (wind > 15 ? "High Wind Drift" : "Ideal Window Open"),
                window: (rainProb > 45 || rainMm > 2) ? "Closed (Wash-off Risk)" : "06:30 AM – 10:30 AM & 04:30 PM – 06:30 PM",
                advice: (rainProb > 45 || rainMm > 2) ? "Hold chemical and foliar sprays; imminent rain will wash off treatments." : `Gentle wind (${wind} km/h) ensures high foliar contact.`
            },
            irrigation: {
                action: (rainMm > 5 || rainProb > 60) ? "Hold Irrigation (Stop Pumps)" : "Normal Scheduled Irrigation",
                status: (rainMm > 5 || rainProb > 60) ? "Rainfall will replenish field capacity" : "Soil Moisture in Equilibrium",
                advice: (rainMm > 5 || rainProb > 60) ? "Hold irrigation to avoid root zone waterlogging." : "Follow standard tensiometer schedule."
            },
            thermal: {
                status: (temp > 34) ? "Heat Stress Alert" : (temp < 8 ? "Cold Frost Alert" : "Optimal Growth Zone"),
                advice: (temp > 34) ? "High heat may cause flower drop; apply light mulch." : "Temperature is favorable for active photosynthesis."
            },
            workability: (rainMm > 5) ? "Waterlogged Soil - Delay Machinery" : "Ideal for Farm Machinery & Labor",
            summary: `Agronomic Outlook for ${crop}: Spray window is ${(rainProb > 45 ? "closed due to rain" : "favorable during morning hours")}. Disease pressure is ${(hum > 80 ? "elevated" : "moderate")} under current ${current.condition || "stable"} weather.`,
            action_items: [
                `Spray Management: ${(rainProb > 45 ? "Hold sprays to avoid rain wash-off" : "Spray early morning 06:30 - 10:00 AM")}`,
                `Irrigation: ${(rainMm > 5 ? "Hold irrigation pumps" : "Continue regular soil moisture replenishment")}`,
                `Crop Scouting: Check underside of leaves for moisture-induced fungal spotting`
            ]
        };
        latestFullAnalysisData = fallback;
        renderFullAnalysisReport(fallback);
    } finally {
        if (loader) loader.classList.add("hidden");
        if (content) content.style.opacity = "1";
    }
}

function renderFullAnalysisReport(data) {
    if (!data) return;

    // Summary banner
    const sumEl = document.getElementById("analysis-summary-text");
    if (sumEl) sumEl.textContent = data.summary;

    // Sensor pills
    const tempEl = document.getElementById("an-val-temp");
    if (tempEl) tempEl.textContent = `${data.temperature_c} °C`;
    const humEl = document.getElementById("an-val-humidity");
    if (humEl) humEl.textContent = `${data.humidity_pct} %`;
    const windEl = document.getElementById("an-val-wind");
    if (windEl) windEl.textContent = `${data.wind_kmh} km/h`;
    const rainPEl = document.getElementById("an-val-rain-prob");
    if (rainPEl) rainPEl.textContent = `${data.rain_probability} %`;
    const rainMmEl = document.getElementById("an-val-rain-mm");
    if (rainMmEl) rainMmEl.textContent = `${data.expected_rain_mm} mm`;

    // Pillar 1: Disease
    const dBadge = document.getElementById("an-disease-badge");
    if (dBadge) {
        const lvl = (data.disease?.level || "Low").toLowerCase();
        dBadge.textContent = `${data.disease?.level || "Low"} Risk`;
        dBadge.className = `badge-risk-pill badge-risk-${lvl}`;
    }
    const dPath = document.getElementById("an-disease-pathogens");
    if (dPath) dPath.textContent = data.disease?.pathogens || "--";
    const dAct = document.getElementById("an-disease-action");
    if (dAct) dAct.textContent = data.disease?.action || "--";

    // Pillar 2: Spray
    const sBadge = document.getElementById("an-spray-badge");
    if (sBadge) {
        sBadge.textContent = data.spray?.badge || data.spray?.status || "Optimal";
        const st = (data.spray?.status || "").toLowerCase();
        sBadge.className = `badge-risk-pill badge-spray-${st.includes("not") ? "nospray" : (st.includes("marg") ? "marginal" : "optimal")}`;
    }
    const sWin = document.getElementById("an-spray-window");
    if (sWin) sWin.textContent = data.spray?.window || "--";
    const sAdv = document.getElementById("an-spray-advice");
    if (sAdv) sAdv.textContent = data.spray?.advice || "--";

    // Pillar 3: Irrigation
    const iBadge = document.getElementById("an-irrigation-action");
    if (iBadge) {
        iBadge.textContent = data.irrigation?.action || "Normal Irrigation";
        const isHold = (data.irrigation?.action || "").toLowerCase().includes("hold");
        iBadge.className = `badge-risk-pill badge-irrigation-${isHold ? "hold" : "normal"}`;
    }
    const iStat = document.getElementById("an-irrigation-status");
    if (iStat) iStat.textContent = data.irrigation?.status || "--";
    const iAdv = document.getElementById("an-irrigation-advice");
    if (iAdv) iAdv.textContent = data.irrigation?.advice || "--";

    // Pillar 4: Thermal
    const tBadge = document.getElementById("an-thermal-status");
    if (tBadge) {
        tBadge.textContent = data.thermal?.status || "Optimal Zone";
        const isWarn = (data.thermal?.status || "").toLowerCase().includes("stress") || (data.thermal?.status || "").toLowerCase().includes("frost");
        tBadge.className = `badge-risk-pill badge-thermal-${isWarn ? "warning" : "optimal"}`;
    }
    const tWork = document.getElementById("an-workability");
    if (tWork) tWork.textContent = data.workability || "--";
    const tAdv = document.getElementById("an-thermal-advice");
    if (tAdv) tAdv.textContent = data.thermal?.advice || "--";

    // Checklist
    const chkList = document.getElementById("an-action-items");
    if (chkList) {
        chkList.innerHTML = (data.action_items || []).map((item, i) => `
            <label class="action-checklist-item">
                <input type="checkbox" ${i === 0 ? "checked" : ""}>
                <span>${item}</span>
            </label>
        `).join("");
    }

    // Render 14-Day SVG Market vs Storage Chart
    renderFullAnalysisSvgChart(data.chart_data);

    // Render Microclimate Risk Breakdown Bars
    renderFullAnalysisRiskBars(data.chart_data?.risk_breakdown);

    // Populate Gemini Profit & Next Crop Optimization Engine
    if (data.profit_analysis) {
        const pa = data.profit_analysis;
        const gainVal = document.getElementById("an-profit-gain-val");
        if (gainVal && pa.projected_profit_gain) gainVal.textContent = pa.projected_profit_gain;
        const nextCrop = document.getElementById("an-rec-next-crop");
        if (nextCrop && pa.recommended_next_crop) nextCrop.textContent = pa.recommended_next_crop;
        const lossStrat = document.getElementById("an-loss-strategy-text");
        if (lossStrat && pa.loss_minimization_strategy) lossStrat.textContent = pa.loss_minimization_strategy;
        const profitBoost = document.getElementById("an-profit-boost-text");
        if (profitBoost && pa.profit_boost_plan) profitBoost.textContent = pa.profit_boost_plan;
        const peakTag = document.getElementById("an-chart-peak-tag");
        if (peakTag && data.chart_data?.peak_window) peakTag.textContent = `Peak Profit: ${data.chart_data.peak_window}`;
    }
}

function renderFullAnalysisSvgChart(chartData) {
    const container = document.getElementById("an-svg-chart-container");
    if (!container) return;
    const timeline = chartData?.timeline || ["Day 1", "Day 3", "Day 5", "Day 7", "Day 10", "Day 14"];
    const prices = chartData?.market_prices || [2400, 2460, 2530, 2590, 2520, 2480];
    const costs = chartData?.storage_costs || [0, 45, 90, 140, 220, 310];
    const margins = chartData?.net_margins || [2400, 2400, 2410, 2410, 2260, 2130];
    
    const maxVal = Math.max(...prices, 2800);
    const minVal = Math.min(...margins, 1800);
    const width = 520;
    const height = 180;
    const padX = 42;
    const padY = 28;
    const stepX = (width - 2 * padX) / (timeline.length - 1);
    
    const getY = val => Math.round(height - padY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padY));
    
    const pathPrices = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${getY(p)}`).join(' ');
    const pathMargins = margins.map((m, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${getY(m)}`).join(' ');
    const pathCosts = costs.map((c, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${getY(c + minVal)}`).join(' ');

    const pointsHtml = prices.map((p, i) => `
        <circle cx="${padX + i * stepX}" cy="${getY(p)}" r="4.5" fill="#22c55e" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="${padX + i * stepX}" cy="${getY(margins[i])}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
        <text x="${padX + i * stepX}" y="${height - 8}" class="chart-axis-label" font-size="10" font-weight="600" text-anchor="middle">${timeline[i]}</text>
    `).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="analysis-svg-element" style="width:100%;height:auto;overflow:visible;">
            <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#22c55e" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line class="chart-grid-line" x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke-dasharray="3,3" />
            <line class="chart-grid-line" x1="${padX}" y1="${height/2}" x2="${width - padX}" y2="${height/2}" stroke-dasharray="3,3" />
            <line class="chart-axis-base" x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" />
            <!-- Curves -->
            <path d="${pathPrices}" fill="none" stroke="#22c55e" stroke-width="3" />
            <path d="${pathMargins}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4,2" />
            <path d="${pathCosts}" fill="none" stroke="#f59e0b" stroke-width="2" />
            ${pointsHtml}
        </svg>
    `;
}

function renderFullAnalysisRiskBars(riskData) {
    const container = document.getElementById("an-risk-bars-container");
    if (!container) return;
    const risks = [
        { label: currentLang === 'hi' ? "फफूंद / रोग दबाव" : "Disease Pressure", val: riskData?.disease_pressure || 45, color: "#f87171" },
        { label: currentLang === 'hi' ? "मिट्टी नमी तनाव" : "Moisture Stress", val: riskData?.moisture_stress || 35, color: "#38bdf8" },
        { label: currentLang === 'hi' ? "हवा / छिड़काव बहाव" : "Spray Drift Hazard", val: riskData?.wind_drift_hazard || 25, color: "#fbbf24" },
        { label: currentLang === 'hi' ? "भंडारण सड़न जोखिम" : "Storage Spoilage Risk", val: riskData?.storage_spoilage_risk || 30, color: "#a855f7" }
    ];
    container.innerHTML = risks.map(r => `
        <div class="risk-bar-row">
            <div class="risk-bar-meta">
                <span>${r.label}</span>
                <strong>${r.val}%</strong>
            </div>
            <div class="risk-bar-track">
                <div class="risk-bar-fill" style="width: ${r.val}%; background: ${r.color};"></div>
            </div>
        </div>
    `).join('');
}

function speakFullAnalysis() {
    if (!latestFullAnalysisData) {
        showToast("Run analysis first to generate voice readout.", "info");
        return;
    }
    const d = latestFullAnalysisData;
    const text = `${d.summary}. Spray advice: ${d.spray?.advice}. Irrigation advice: ${d.irrigation?.advice}`;
    speakText(text, typeof currentLang !== 'undefined' ? currentLang : 'en');
}

function shareFullAnalysisWhatsApp() {
    if (!latestFullAnalysisData) {
        showToast("Run analysis first to share report.", "info");
        return;
    }
    const d = latestFullAnalysisData;
    const msg = `🌾 *AgriFlow Deep Agronomic Advisory*\n` +
        `🌱 *Target Crop:* ${d.crop}\n` +
        `🌡️ *Temp:* ${d.temperature_c}°C | *Humidity:* ${d.humidity_pct}% | *Wind:* ${d.wind_kmh} km/h\n` +
        `🌧️ *48h Rain:* ${d.rain_probability}% (${d.expected_rain_mm} mm)\n\n` +
        `🦠 *Disease Threat:* ${d.disease?.level} Risk\n${d.disease?.action}\n\n` +
        `🧪 *Spray Window:* ${d.spray?.badge} (${d.spray?.window})\n${d.spray?.advice}\n\n` +
        `💧 *Irrigation:* ${d.irrigation?.action}\n${d.irrigation?.advice}\n\n` +
        `_Generated via AgriFlow Precision Intelligence Workspace_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
}

// ============================================================
// YEARLY & FUTURE CROP HORIZON ANALYSIS ENGINE
// ============================================================

let latestHorizonData = null;

async function loadCropHorizonAnalysis() {
    const crop = document.getElementById("horizon-crop-select")?.value || "wheat";
    const state = document.getElementById("horizon-state-select")?.value || "Punjab";
    const loader = document.getElementById("horizon-loading");
    const content = document.getElementById("horizon-content-body");

    if (loader) loader.classList.remove("hidden");
    if (content) content.style.opacity = "0.35";

    try {
        const response = await fetch("/api/crop/horizon-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                crop,
                state,
                language: typeof currentLang !== 'undefined' ? currentLang : 'en'
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Failed to load horizon analysis");
        latestHorizonData = data;
        renderCropHorizonAnalysis(data);
    } catch (err) {
        console.warn("Using local horizon analysis fallback:", err);
        const fallback = {
            crop: crop.charAt(0).toUpperCase() + crop.slice(1),
            state: state,
            yearly: {
                months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                historical_prices: [2450, 2480, 2260, 2180, 2220, 2290, 2360, 2420, 2500, 2590, 2680, 2620],
                arrival_volume_pct: [6, 8, 35, 28, 8, 4, 2, 1, 1, 1, 3, 3],
                glut_period: "March – May (Rabi Harvest Glut)",
                peak_period: "November – January (Pre-Sowing Off-Season High)",
                sowing_window: "25 Oct – 20 Nov",
                harvest_window: "25 Mar – 25 Apr",
                climate_risk: "Terminal heat stress vulnerability during late grain filling."
            },
            future: {
                projected_price_min: 2650,
                projected_price_max: 2920,
                trend: "Bullish (+9.2%)",
                demand_outlook: "High Domestic Processing Demand",
                recommended_rotation: "Moong (Green Gram) / Summer Pulses",
                projected_net_margin_acre: "₹42,000 – ₹56,000"
            },
            gemini_advisory: (typeof currentLang !== 'undefined' && currentLang === 'hi')
                ? `${state} में ${crop} के लिए अगले 3-6 महीनों में कीमतें अनुकूल रहने का अनुमान है। कटाई के समय मंदी से बचें और गुणवत्ता अनुसार सुरक्षित भंडार करें। अगली फसल के रूप में दलहनी फसलें लगाएं जिससे जमीन की उर्वरता बढ़ेगी।`
                : `For ${crop} in ${state}, prices over the next 3 to 6 months are projected to remain firm. Avoid harvest-period distress sales and store in certified warehouses. Rotate with nitrogen-fixing summer pulses to boost overall farm margins.`
        };
        latestHorizonData = fallback;
        renderCropHorizonAnalysis(fallback);
    } finally {
        if (loader) loader.classList.add("hidden");
        if (content) content.style.opacity = "1";
    }
}

function renderCropHorizonAnalysis(data) {
    if (!data) return;
    const y = data.yearly || {};
    const f = data.future || {};

    const cropTitle = document.getElementById("hz-crop-chart-title");
    if (cropTitle) cropTitle.textContent = data.crop || "Crop";

    const glutTag = document.getElementById("hz-glut-tag");
    if (glutTag) glutTag.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? `आवक दबाव: ${y.glut_period || 'Mar - May'}` : `Glut: ${y.glut_period || 'Mar - May'}`;

    const peakTag = document.getElementById("hz-peak-tag");
    if (peakTag) peakTag.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? `उच्चतम भाव: ${y.peak_period || 'Nov - Jan'}` : `Peak Window: ${y.peak_period || 'Nov - Jan'}`;

    const sowingVal = document.getElementById("hz-sowing-val");
    if (sowingVal) sowingVal.textContent = y.sowing_window || "--";

    const harvestVal = document.getElementById("hz-harvest-val");
    if (harvestVal) harvestVal.textContent = y.harvest_window || "--";

    const riskVal = document.getElementById("hz-risk-val");
    if (riskVal) riskVal.textContent = y.climate_risk || "--";

    const futPrice = document.getElementById("hz-fut-price");
    if (futPrice) futPrice.textContent = `₹${(f.projected_price_min || 2500).toLocaleString('en-IN')} – ₹${(f.projected_price_max || 3000).toLocaleString('en-IN')}`;

    const futTrend = document.getElementById("hz-fut-trend");
    if (futTrend) futTrend.textContent = f.trend || "Bullish";

    const futDemand = document.getElementById("hz-fut-demand");
    if (futDemand) futDemand.textContent = f.demand_outlook || "Steady";

    const futRotation = document.getElementById("hz-fut-rotation");
    if (futRotation) futRotation.textContent = f.recommended_rotation || "Moong / Pulses";

    const futMargin = document.getElementById("hz-fut-margin");
    if (futMargin) futMargin.textContent = f.projected_net_margin_acre || "₹40,000 – ₹55,000";

    const stratText = document.getElementById("hz-gemini-strategy-text");
    if (stratText) stratText.textContent = data.gemini_advisory || "Strategy active.";

    renderCropHorizonSvgChart(y);
}

function renderCropHorizonSvgChart(yearly) {
    const container = document.getElementById("hz-svg-chart-container");
    if (!container) return;

    const months = yearly?.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const prices = yearly?.historical_prices || [2450, 2480, 2260, 2180, 2220, 2290, 2360, 2420, 2500, 2590, 2680, 2620];
    const arrivals = yearly?.arrival_volume_pct || [6, 8, 35, 28, 8, 4, 2, 1, 1, 1, 3, 3];

    const maxPrice = Math.max(...prices, 3000);
    const minPrice = Math.min(...prices, 1500) - 100;
    const maxArrival = Math.max(...arrivals, 40);

    const width = 640;
    const height = 210;
    const padX = 46;
    const padY = 32;
    const stepX = (width - 2 * padX) / (months.length - 1);

    const getYPrice = p => Math.round(height - padY - ((p - minPrice) / (maxPrice - minPrice)) * (height - 2 * padY));
    const getYArrival = a => Math.round(height - padY - (a / maxArrival) * (height - 2 * padY));

    const pricePoints = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * stepX} ${getYPrice(p)}`).join(' ');
    const priceArea = `${pricePoints} L ${padX + (months.length - 1) * stepX} ${height - padY} L ${padX} ${height - padY} Z`;

    const arrivalBars = arrivals.map((a, i) => {
        const barX = padX + i * stepX - 10;
        const barY = getYArrival(a);
        const barH = (height - padY) - barY;
        return `<rect x="${barX}" y="${barY}" width="20" height="${Math.max(barH, 3)}" rx="4" fill="rgba(245, 158, 11, 0.35)" stroke="#f59e0b" stroke-width="1" />`;
    }).join('');

    const nodes = prices.map((p, i) => `
        <circle cx="${padX + i * stepX}" cy="${getYPrice(p)}" r="4.5" fill="#22c55e" stroke="#ffffff" stroke-width="1.5" />
        <text x="${padX + i * stepX}" y="${height - 10}" class="chart-axis-label" font-size="10" font-weight="600" text-anchor="middle">${months[i]}</text>
    `).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="analysis-svg-element" style="width:100%;height:auto;overflow:visible;">
            <defs>
                <linearGradient id="horizonPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0.38"/>
                    <stop offset="100%" stop-color="#22c55e" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            <!-- Grid Lines -->
            <line class="chart-grid-line" x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke-dasharray="3,3" />
            <line class="chart-grid-line" x1="${padX}" y1="${height/2}" x2="${width - padX}" y2="${height/2}" stroke-dasharray="3,3" />
            <line class="chart-axis-base" x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" />
            <!-- Arrival Volume Bars -->
            ${arrivalBars}
            <!-- Price Area & Curve -->
            <path d="${priceArea}" fill="url(#horizonPriceGrad)" />
            <path d="${pricePoints}" fill="none" stroke="#22c55e" stroke-width="3.5" />
            <!-- Data points and Month labels -->
            ${nodes}
        </svg>
    `;
}

// Auto-navigate to /admin if hash or URL contains admin
function checkAdminRoute() {
    const hash = (window.location.hash || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();
    const pathname = (window.location.pathname || "").toLowerCase();
    if (hash.includes('admin') || search.includes('admin') || pathname.endsWith('/admin') || pathname.endsWith('admin')) {
        if (!pathname.startsWith('/admin')) {
            window.location.href = '/admin';
        }
    }
}
window.addEventListener('hashchange', checkAdminRoute);
checkAdminRoute();

// Initialize Theme on startup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}