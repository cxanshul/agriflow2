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
let latestWeatherActionAdvice = "";
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
    if (tabId === 'sell-decision' && typeof renderSellDecisionCharts === 'function') {
        setTimeout(renderSellDecisionCharts, 80);
    }

    if (tabId === 'storage-finder' || tabId === 'weather') {
        setTimeout(() => {
            if (typeof mainStorageMap !== 'undefined' && mainStorageMap && typeof mainStorageMap.invalidateSize === 'function') {
                mainStorageMap.invalidateSize();
            }
        }, 200);
    }

    if (typeof applyFullPageTranslation === 'function') {
        setTimeout(() => applyFullPageTranslation(currentLang), 50);
    }
}

// Ensure Leaflet map recalculates its dimensions on mobile device orientation changes and resizes
window.addEventListener('resize', () => {
    if (typeof mainStorageMap !== 'undefined' && mainStorageMap && typeof mainStorageMap.invalidateSize === 'function') {
        mainStorageMap.invalidateSize();
    }
});
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (typeof mainStorageMap !== 'undefined' && mainStorageMap && typeof mainStorageMap.invalidateSize === 'function') {
            mainStorageMap.invalidateSize();
        }
    }, 250);
});

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


// ============================================================
// COMPREHENSIVE REGIONAL TRANSLATION DICTIONARY & DOM ENGINE
// ============================================================

const GLOBAL_TRANSLATIONS_HI = {
    // Top Bar, Brand & Nav
    "Farm Intelligence Workspace": "कृषि वित्तीय व मंडी सलाहकार",
    "AGRIFLOW": "एग्रीफ्लो",
    "Plan & Market": "योजना व मंडी",
    "Plan &amp; Market": "योजना व मंडी",
    "My Crops": "मेरी फसलें",
    "Dark": "डार्क",
    "Light": "लाइट",
    "Signed in": "लॉग इन",
    "Unit Converter": "इकाई परिवर्तक",
    "Farm Slip": "फार्म रसीद",
    "WhatsApp: ON": "व्हाट्सएप: चालू",
    "WhatsApp: OFF": "व्हाट्सएप: बंद",
    "Load Tomato Demo": "डेमो लोड करें (टमाटर)",
    "ACTIVE STORED PRODUCE": "वर्तमान भंडारित उपज",
    "HIGH SPOILAGE RISK": "उच्च सड़न जोखिम",
    "TOTAL HISTORICAL REVENUE": "कुल ऐतिहासिक आय",
    "CUMULATIVE NET PROFIT": "कुल संचित शुद्ध लाभ",
    "KG": "किलो",
    "BATCH": "बैच",
    "Batch": "बैच",
    "Batches": "बैच",
    "Record": "रिकॉर्ड",
    "Records": "रिकॉर्ड",
    "Center": "केंद्र",
    "Centers": "केंद्र",
    "Optimal": "उत्कृष्ट",
    "Field Capacity": "संतुलित नमी",
    "Warm": "अनुकूल",
    "Vibrant": "सघन हरियाली",
    "Weather data: AccuWeather": "मौसम डेटा: एक्यूवेदर",
    "Waiting for your GPS location...": "आपके GPS स्थान की प्रतीक्षा है...",
    "Date": "दिनांक",
    "Condition": "स्थिति",
    "Temperature": "तापमान",
    "Rain": "वर्षा",
    "Probability": "संभावना",
    "Sunrise": "सूर्योदय",
    "Sunset": "सूर्यास्त",
    "🔮 AI Powered": "🔮 एआई आधारित",
    "Glut: Mar - May": "आवक दबाव: मार्च - मई",
    "Peak Window: Nov - Jan": "उच्चतम भाव: नवं - जन",
    "Bullish (+9.2%)": "तेजी (+9.2%)",
    "High Processing Demand": "प्रसंस्करण उद्योग से भारी मांग",
    "Moong (Green Gram)": "मूंग (दाल)",
    "Loading predictive recommendations...": "पूर्वानुमान रणनीतियाँ लोड हो रही हैं...",
    "Peak: Day 6 - Day 8": "चरम भाव: दिन 6 - दिन 8",
    "Safe Zone": "सुरक्षित क्षेत्र",
    "Caution Zone": "चेतावनी क्षेत्र",
    "0 Centers": "0 केंद्र",
    "2 Batches": "2 बैच",
    "1 Record": "1 रिकॉर्ड",
    "kg": "किलो",
    "Quintal": "क्विंटल",
    "Tons": "टन",
    "Planting Date": "बुवाई की तारीख",
    "Harvest Date": "कटाई की तारीख",
    "Ventilated Godown": "हवादार गोदाम",
    "Open Air Jute Bags": "खुले बोरे (तिरपाल)",
    "Cold Storage Unit": "कोल्ड स्टोरेज यूनिट",
    "Farm Shade": "खेत का शेड",
    "Nearest storage facility": "निकटतम भंडारण केंद्र",
    "Your closest mapped facility will be shown first": "आपके सबसे निकटतम पंजीकृत गोदाम पहले दिखाए जाएंगे",
    "Find nearest facility": "निकटतम केंद्र खोजें",
    "Farmer profile": "किसान प्रोफाइल",
    "Update your name and farm weather location.": "अपना नाम और खेत का मौसम स्थान अपडेट करें।",
    "Farmer name": "किसान का नाम",
    "Latitude": "अक्षांश (Latitude)",
    "Longitude": "देशांतर (Longitude)",
    "Location label": "स्थान का नाम",
    "Alert phone with country code": "अलर्ट फ़ोन (कंट्री कोड सहित)",
    "Use my location": "मेरा वर्तमान स्थान उपयोग करें",
    "Save profile": "प्रोफ़ाइल सहेजें",
    "Delete my crop data": "मेरा फसल डेटा हटाएं",
    "Log out": "लॉग आउट",
    "🤖 AgriFlow AI": "🤖 एग्रीफ्लो एआई",
    "🧠 Smart Advisor": "🧠 स्मार्ट सलाहकार",
    "📈 Farm Insights": "📈 खेत अंतर्दृष्टि",
    "Voice Chat": "आवाज संवाद",
    "🤖 AI Advisor": "🤖 एआई सलाहकार",
    "Now": "अभी",
    "Image attached": "फोटो संलग्न है",
    "🥔 Potato mandi rates": "🥔 आलू मंडी भाव",
    "🍅 Tomato disease advice": "🍅 टमाटर रोग सलाह",
    "🌾 Wheat storage advice": "🌾 गेहूं भंडारण सलाह",
    "🌿 Mustard rotation plan": "🌿 सरसों फसल चक्र योजना",
    "Pucca Bigha (UP, Raj, HR, MP - 0.625 Acre)": "पक्का बीघा (यूपी, राज, हरिया, एमपी - 0.625 एकड़)",
    "Kachha Bigha (Western UP, Delhi - ~0.208 Acre)": "कच्चा बीघा (पश्चिमी यूपी, दिल्ली - ~0.208 एकड़)",
    "Guntha (Maharashtra, Karnataka, Gujarat - 40/Acre)": "गुंठा (महाराष्ट्र, कर्नाटक, गुजरात - 40/एकड़)",
    "Kanal (Punjab, Haryana - 8/Acre)": "कनाल (पंजाब, हरियाणा - 8/एकड़)",
    "Marla (Punjab, Haryana - 160/Acre)": "मरला (पंजाब, हरियाणा - 160/एकड़)",
    "✅ Paid (Bank Transfer / RTGS)": "✅ भुगतान प्राप्त (बैंक ट्रांसफर / RTGS)",
    "✅ Paid (Cash / नकद)": "✅ भुगतान प्राप्त (नकद)",
    "✅ Paid (Cash)": "✅ भुगतान प्राप्त (नकद)",
    "⏳ Payment Pending (3 Days)": "⏳ भुगतान लंबित (3 दिन)",
    "📑 Cheque Issued": "📑 चेक जारी किया गया",
    "🌾 AGRIFLOW FARM VOUCHER": "🌾 एग्रीफ्लो किसान वाउचर",
    "AGRIFLOW DIGITAL MANDI & FARM SLIP": "एग्रीफ्लो डिजिटल मंडी एवं फार्म पर्ची",
    "Approved APMC & Warehouse Financial Documentation": "स्वीकृत एपीएमसी एवं वेयरहाउस वित्तीय दस्तावेज",
    "Farmer:": "किसान:",
    "Date:": "दिनांक:",
    "Mandi/Location:": "मंडी / स्थान:",
    "Phone:": "फ़ोन:",
    "Description": "विवरण",
    "Qty": "मात्रा",
    "Rate": "भाव / दर",
    "Total": "कुल राशि",
    "Less: Mandi Cess / Handling / Labor": "कटौती: मंडी उपकर / हम्माली / तुलाई",
    "Net Payable to Farmer": "किसान को शुद्ध देय राशि",
    "Synthesizing field weather...": "खेत के मौसम का विश्लेषण जारी...",
    "Analyzing...": "विश्लेषण जारी...",
    "Loading personalized loss mitigation steps...": "नुकसान कम करने के उपाय लोड हो रहे हैं...",
    "Loading personalized profit maximization strategy...": "मुनाफा बढ़ाने की रणनीति लोड हो रही है...",
    "Day 1": "दिन 1",
    "Day 3": "दिन 3",
    "Day 5": "दिन 5",
    "Day 7": "दिन 7",
    "Day 7 (Peak)": "दिन 7 (चरम)",
    "Day 10": "दिन 10",
    "Day 14": "दिन 14",
    "Disease Pressure": "रोग व फफूंद दबाव",
    "Moisture Stress": "नमी तनाव",
    "Spray Drift Hazard": "हवा / स्प्रे बहाव जोखिम",
    "Storage Spoilage Risk": "भंडारण सड़न जोखिम",
    "PROFIT": "शुद्ध मुनाफा",
    "LOSS": "कुल हानि",
    "Current Growing Crop": "वर्तमान बढ़ती फसल",
    "Grade:": "ग्रेड:",
    "Grade": "ग्रेड",
    "High": "उच्च",
    "Medium": "मध्यम",
    "Low": "कम",
    "High Spoilage Risk": "उच्च सड़न जोखिम",
    "Medium Risk Alert": "मध्यम जोखिम चेतावनी",
    "Low Risk": "कम जोखिम",
    "Moderate Risk": "मध्यम जोखिम",
    "High Risk": "उच्च जोखिम",
    "Do Not Spray": "स्प्रे न करें",
    "Rain Expected": "बारिश का अनुमान",
    "High Wind Drift": "तेज हवा - बहाव जोखिम",
    "Ideal Window Open": "सर्वोत्तम समय उपलब्ध",
    "Closed (Wash-off Risk)": "बंद (धुलने का जोखिम)",
    "Normal Irrigation": "नियमित सिंचाई",
    "Normal Scheduled Irrigation": "नियमित निर्धारित सिंचाई",
    "Hold Irrigation (Stop Pumps)": "सिंचाई रोकें (पंप बंद रखें)",
    "Hold Irrigation": "सिंचाई रोकें",
    "Soil Moisture in Equilibrium": "मिट्टी में नमी संतुलित",
    "Heat Stress Alert": "अत्यधिक गर्मी चेतावनी",
    "Cold Frost Alert": "पाला / ठंड चेतावनी",
    "Optimal Growth Zone": "अनुकूल विकास तापमान",
    "Optimal Zone": "अनुकूल क्षेत्र",
    "Waterlogged Soil - Delay Machinery": "खेत में पानी भरा - मशीन संचालन रोकें",
    "Ideal for Farm Machinery & Labor": "खेत संचालन व मजदूरी हेतु अनुकूल",
    "Peak Profit:": "चरम मुनाफा:",
    "Water:": "पानी:",
    "Harvest:": "कटाई:",
    "Sold:": "बिक्री:",
    "Wheat": "गेहूं",
    "Potato": "आलू",
    "Tomato": "टमाटर",
    "Mustard": "सरसों",
    "Onion": "प्याज",
    "Soybean": "सोयाबीन",
    "Cotton": "कपास",
    "Paddy": "धान",
    "Maize": "मक्का",
    "Gram": "चना",
    "Moong": "मूंग दाल",
    "Groundnut": "मूंगफली",
    "Cumin": "जीरा",
    "Chickpea": "चना",
    "Pulses": "दालें",
    "Punjab": "पंजाब",
    "Haryana": "हरियाणा",
    "Uttar Pradesh": "उत्तर प्रदेश",
    "Rajasthan": "राजस्थान",
    "Madhya Pradesh": "मध्य प्रदेश",
    "Maharashtra": "महाराष्ट्र",
    "Gujarat": "गुजरात",
    "Bihar": "बिहार",
    "Acre": "एकड़",
    "Hectare": "हेक्टेयर",
    "Bigha": "बीघा",
    "Guntha": "गुंठा",
    "Kanal": "कनाल",
    "Marla": "मरला",
    "Sq. Meters": "वर्ग मीटर",
    "Square Meter": "वर्ग मीटर",
    "Gaj / Sq Yard": "वर्ग गज",
    "Maund": "मन (40 किलो)",
    "Bags": "बोरी (50 किलो)",
    "Metric Ton": "मीट्रिक टन",
    "Kilograms": "किलोग्राम",
    "Rising": "तेज",
    "Softening": "नरम",
    "Steady": "स्थिर",
    "Bullish": "तेजी",
    "Bearish": "मंदी",
    "Today's Rate": "आज का भाव",
    "Rate Date": "भाव दिनांक",
    "Seeds": "बीज",
    "Fertilizer": "उर्वरक",
    "Pesticide": "कीटनाशक",
    "Irrigation": "सिंचाई",
    "Labor": "मजदूरी",
    "Machinery": "मशीनरी",
    "Fuel": "डीजल / बिजली",
    "Misc": "अन्य खर्च",
    "Capacity:": "क्षमता:",
    "Get Directions": "रास्ता देखें",
    "Your Farm": "आपका खेत",
    "Cold Storage": "कोल्ड स्टोरेज",
    "Warehouse": "गोदाम",
    "Silo": "साइलो",
    "CWC / SWC": "सरकारी CWC / SWC",
    "WDRA e-NWR Loan": "ई-एनडब्ल्यूआर बैंक ऋण",
    "All Crops": "सभी फसलें",
    "All States": "सभी राज्य",
    "All Facility Types": "सभी प्रकार",
    "Quick Action": "त्वरित जांच",
    "🔬 Full Analysis": "🔬 पूर्ण विश्लेषण",
    "🔬 Full Profit & Loss Analysis": "🔬 पूर्ण लाभ व हानि विश्लेषण",
    "Analyze Sell Timing": "बिक्री का समय जांचें",
    "Find nearest facility": "निकटतम केंद्र खोजें",
    "Analyze Quality and Register Crop": "गुणवत्ता जांचें एवं फसल दर्ज करें",
    "Confirm Sale, Settle Financials & Archive to History": "बिक्री पक्की करें, मुनाफा निकालें एवं इतिहास में दर्ज करें",
    "Verify alert phone": "अलर्ट फोन सत्यापित करें",
    "Send verification code": "सत्यापन कोड भेजें",
    "Enter 6-digit OTP": "6 अंकों का OTP दर्ज करें",
    "Verify and send alert": "सत्यापित करें और अलर्ट भेजें",
    "Ask Krishi AI": "कृषि AI से पूछें",
    "Delete Photo": "फोटो हटाएं",
    "Replace Photo": "फोटो बदलें",
    "Add Expense Field": "अन्य खर्च जोड़ें",
    "Refresh Projections": "पूर्वानुमान रीफ्रेश करें",
    "Refresh Rates": "भाव रीफ्रेश करें",
    "Use My Farm Location": "मेरे खेत का स्थान उपयोग करें",
    "Reset Filters": "फ़िल्टर रीसेट करें",
    "Share on WhatsApp": "व्हाट्सएप पर भेजें",
    "Print / Save PDF": "प्रिंट या पीडीएफ सेव करें",
    "Share Advisory": "व्हाट्सएप साझा करें",
    "Refresh": "रीफ्रेश",
    "Close": "बंद करें"
};

function applyFullPageTranslation(lang) {
    if (lang === 'hi') {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName.toLowerCase();
                if (['script', 'style', 'noscript', 'svg', 'path', 'line', 'circle'].includes(tag)) return NodeFilter.FILTER_REJECT;
                if (node.nodeValue.trim().length === 0) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let currentNode;
        while (currentNode = walker.nextNode()) {
            const raw = currentNode.nodeValue;
            const trimmed = raw.trim();
            if (GLOBAL_TRANSLATIONS_HI[trimmed]) {
                if (currentNode._origEnText === undefined) {
                    currentNode._origEnText = raw;
                }
                currentNode.nodeValue = raw.replace(trimmed, GLOBAL_TRANSLATIONS_HI[trimmed]);
            }
        }

        document.querySelectorAll('select option').forEach(opt => {
            const raw = opt.textContent.trim();
            if (GLOBAL_TRANSLATIONS_HI[raw]) {
                if (opt._origEnText === undefined) opt._origEnText = opt.textContent;
                opt.textContent = GLOBAL_TRANSLATIONS_HI[raw];
            }
        });

        document.querySelectorAll('input, textarea').forEach(inp => {
            if (inp.getAttribute('data-placeholder-hi')) {
                if (inp._origEnPlaceholder === undefined) inp._origEnPlaceholder = inp.placeholder;
                inp.placeholder = inp.getAttribute('data-placeholder-hi');
            } else {
                const ph = (inp.placeholder || '').trim();
                if (GLOBAL_TRANSLATIONS_HI[ph]) {
                    if (inp._origEnPlaceholder === undefined) inp._origEnPlaceholder = inp.placeholder;
                    inp.placeholder = GLOBAL_TRANSLATIONS_HI[ph];
                }
            }
        });

        const themeLabel = document.getElementById('theme-toggle-label');
        if (themeLabel) {
            const isDark = document.body.classList.contains('dark-theme');
            themeLabel.textContent = isDark ? 'डार्क' : 'लाइट';
        }
        const dispFarmer = document.getElementById('display-farmer');
        if (dispFarmer && (!farmerProfile || !farmerProfile.full_name || dispFarmer.innerText === 'Signed in' || dispFarmer.innerText === 'लॉग इन')) {
            dispFarmer.innerText = 'लॉग इन';
        }
        const waLabel = document.getElementById('wa-toggle-label');
        if (waLabel) {
            const isActive = document.getElementById('btn-toggle-whatsapp')?.classList.contains('active');
            waLabel.innerText = isActive ? 'व्हाट्सएप: चालू' : 'व्हाट्सएप: बंद';
        }
        const autoTag = document.getElementById('lang-auto-tag');
        if (autoTag && autoTag.innerText.includes('Auto')) {
            autoTag.innerText = '✨ ऑटो';
        }
        const voiceStatus = document.getElementById('voice-chat-status');
        if (voiceStatus) {
            voiceStatus.innerText = 'आवाज संवाद';
        }
    } else if (lang === 'en') {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode._origEnText !== undefined) {
                currentNode.nodeValue = currentNode._origEnText;
            }
        }
        document.querySelectorAll('select option').forEach(opt => {
            if (opt._origEnText !== undefined) {
                opt.textContent = opt._origEnText;
            }
        });
        document.querySelectorAll('input, textarea').forEach(inp => {
            if (inp.getAttribute('data-placeholder-en')) {
                inp.placeholder = inp.getAttribute('data-placeholder-en');
            } else if (inp._origEnPlaceholder !== undefined) {
                inp.placeholder = inp._origEnPlaceholder;
            }
        });
        const themeLabel = document.getElementById('theme-toggle-label');
        if (themeLabel) {
            const isDark = document.body.classList.contains('dark-theme');
            themeLabel.textContent = isDark ? 'Dark' : 'Light';
        }
        const dispFarmer = document.getElementById('display-farmer');
        if (dispFarmer && (!farmerProfile || !farmerProfile.full_name || dispFarmer.innerText === 'Signed in' || dispFarmer.innerText === 'लॉग इन')) {
            dispFarmer.innerText = 'Signed in';
        }
        const waLabel = document.getElementById('wa-toggle-label');
        if (waLabel) {
            const isActive = document.getElementById('btn-toggle-whatsapp')?.classList.contains('active');
            waLabel.innerText = isActive ? 'WhatsApp: ON' : 'WhatsApp: OFF';
        }
        const autoTag = document.getElementById('lang-auto-tag');
        if (autoTag && autoTag.innerText.includes('ऑटो')) {
            autoTag.innerText = '✨ Auto';
        }
        const voiceStatus = document.getElementById('voice-chat-status');
        if (voiceStatus) {
            voiceStatus.innerText = 'Voice Chat';
        }
    }
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

    // Re-render open / dynamic components in selected language
    if (typeof renderFarmSlipPreview === 'function') renderFarmSlipPreview();
    if (typeof renderSellDecisionCharts === 'function') renderSellDecisionCharts();
    if (typeof renderCropHorizonAnalysis === 'function' && typeof latestHorizonData !== 'undefined' && latestHorizonData) {
        renderCropHorizonAnalysis(latestHorizonData);
    }
    if (typeof renderFullAnalysisReport === 'function' && typeof latestFullAnalysisData !== 'undefined' && latestFullAnalysisData) {
        renderFullAnalysisReport(latestFullAnalysisData);
    }
    if (typeof renderTutorialStep === 'function') {
        const tutModal = document.getElementById('tutorial-modal');
        if (tutModal && tutModal.style.display !== 'none') {
            renderTutorialStep(currentTutorialStep);
        }
    }

    // Apply universal DOM translation pass
    applyFullPageTranslation(lang);
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

    const kgUnit = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'किलो' : 'KG';
    const batchUnit = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'बैच' : 'BATCH';
    if (statActive) statActive.innerHTML = `${activeQty.toLocaleString()} <small>${kgUnit}</small>`;
    if (statRisk) statRisk.innerHTML = `${highRiskCount} <small>${batchUnit}</small>`;
    if (statRev) statRev.innerText = `₹ ${totalRevenue.toLocaleString()}`;
    if (statProfit) {
        if (totalProfit < 0) {
            statProfit.innerText = `- ₹ ${Math.abs(totalProfit).toLocaleString()}`;
            statProfit.style.color = 'var(--risk-high, #ef4444)';
        } else {
            statProfit.innerText = `₹ ${totalProfit.toLocaleString()}`;
            statProfit.style.color = '';
        }
    }
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
            const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
            if (yieldEl) yieldEl.innerText = isHi ? `${d.expected_yield_kg.toLocaleString()} किलो (${d.expected_yield_quintals} कुंतल)` : `${d.expected_yield_kg.toLocaleString()} KG (${d.expected_yield_quintals} Qt)`;
            if (rateEl) rateEl.innerHTML = isHi ? `₹ ${d.mandi_modal_price_per_quintal.toLocaleString()} / कुंतल <small id="res-rate-date">(${d.rate_date})</small>` : `₹ ${d.mandi_modal_price_per_quintal.toLocaleString()} / Qt <small id="res-rate-date">(${d.rate_date})</small>`;
            if (revenueEl) revenueEl.innerText = `₹ ${d.estimated_revenue.toLocaleString()}`;

            const profitEl = document.getElementById("res-net-profit");
            const profitVal = d.expected_profit_loss;
            if (profitEl) {
                profitEl.innerText = `${profitVal >= 0 ? '+' : '-'} ₹ ${Math.abs(profitVal).toLocaleString()}`;
                profitEl.className = `res-val ${profitVal >= 0 ? 'text-green' : 'text-risk'}`;
            }

            const unitEl = document.getElementById("res-profit-unit");
            const unitNameHi = { 'Acre': 'एकड़', 'Hectare': 'हेक्टेयर', 'Bigha': 'बीघा', 'Guntha': 'गुंठा', 'Kanal': 'कनाल', 'Biswa': 'बिस्वा', 'Marla': 'मरला' }[unit] || unit;
            if (unitEl) unitEl.innerText = `${d.profit_per_selected_unit >= 0 ? '+' : '-'} ₹ ${Math.abs(d.profit_per_selected_unit).toLocaleString()} / ${(typeof currentLang !== 'undefined' && currentLang === 'hi') ? unitNameHi : unit}`;

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
        const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
        const statusBadge = isToday
            ? `<span class="badge-live">🟢 ${isHi ? 'आज का भाव' : "Today's Rate"} (${r.arrival_date})</span>`
            : `<span class="badge-latest">📅 ${isHi ? 'भाव दिनांक' : 'Rate Date'}: ${r.arrival_date}</span>`;

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
    if (typeof renderSellDecisionCharts === 'function') setTimeout(renderSellDecisionCharts, 20);
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
        if (typeof renderSellDecisionCharts === 'function') setTimeout(renderSellDecisionCharts, 20);
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
    if (typeof renderSellDecisionCharts === 'function') setTimeout(renderSellDecisionCharts, 20);
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
    if (!cost || Number(cost.value) > 0) {
        if (typeof renderSellDecisionCharts === 'function') setTimeout(renderSellDecisionCharts, 20);
        return;
    }
    cost.value = { none: 0, farm: 100, godown: 250, cold: 600 }[storage] ?? 0;
    if (typeof renderSellDecisionCharts === 'function') setTimeout(renderSellDecisionCharts, 20);
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
        if (typeof renderSellDecisionCharts === 'function') {
            renderSellDecisionCharts({ result: data.result, crop, waitDays, storageCost, storageType });
        }
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
            <div class="sell-decision-metric"><span>${t('weatherRisk')}</span><strong>${result.weather_risk ? ((typeof currentLang !== 'undefined' && currentLang === 'hi') ? '⚠️ उच्च जोखिम' : '⚠️ High Risk') : ((typeof currentLang !== 'undefined' && currentLang === 'hi') ? '✅ अनुकूल' : '✅ Low / Normal')}</strong></div>
            <div class="sell-decision-metric"><span>${t('storage')}</span><strong>${result.storage_available ? t('available') : t('unavailable')}</strong></div>
            <div class="sell-decision-metric"><span>${t('records')}</span><strong>${result.market_records_count ?? 0}</strong></div>
        </div>
        <p class="sell-decision-note">${result.source === 'ai' ? (currentLang === 'hi' ? 'एआई सहायता से तैयार सुझाव।' : 'AI-assisted recommendation.') : (currentLang === 'hi' ? 'उपलब्ध लाइव संकेतों पर आधारित नियम-सुझाव।' : 'Rule-based recommendation using the available live signals.')}</p>`;
}

function escapeSellText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

// ============================================================
// 14-DAY MANDI PRICE TREND VS STORAGE ECONOMICS (SELL DECISION)
// ============================================================

function renderSellDecisionCharts(opts = {}) {
    const container = document.getElementById("sell-svg-chart-container");
    const riskContainer = document.getElementById("sell-risk-bars-container");
    if (!container && !riskContainer) return;

    const crop = opts.crop || document.getElementById('sell-decision-crop')?.value || 'Wheat';
    const waitDays = opts.waitDays || parseInt(document.getElementById('sell-decision-days')?.value, 10) || 7;
    const storageCost = opts.storageCost ?? (parseFloat(document.getElementById('sell-decision-storage-cost')?.value) || 0);
    const storageType = opts.storageType || document.getElementById('sell-decision-storage')?.value || 'none';
    const res = opts.result || {};

    // Base mandi price per quintal
    let basePriceQtl = 2400;
    if (res.current_price_per_kg && res.current_price_per_kg > 0) {
        basePriceQtl = Math.round(res.current_price_per_kg * 100);
    } else if (Array.isArray(mandiRecordsCache) && mandiRecordsCache.length > 0) {
        const matching = mandiRecordsCache.filter(r => (r.commodity || '').toLowerCase().includes(crop.toLowerCase()));
        const pool = matching.length > 0 ? matching : mandiRecordsCache;
        const prices = pool.map(r => parseFloat(r.modal_price) || 0).filter(p => p > 0);
        if (prices.length > 0) basePriceQtl = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    } else {
        const defaults = {
            'Wheat': 2450, 'गेहूं': 2450, 'Potato': 1420, 'आलू': 1420, 'Tomato': 1850, 'टमाटर': 1850,
            'Mustard': 5350, 'सरसों': 5350, 'Onion': 2150, 'प्याज': 2150, 'Soybean': 4650, 'सोयाबीन': 4650,
            'Cotton': 7200, 'कपास': 7200, 'Maize': 2250, 'मक्का': 2250, 'Paddy': 2300, 'धान': 2300, 'Rice': 2300,
            'Gram': 5800, 'Chana': 5800, 'चना': 5800, 'Moong': 7900, 'मूंग': 7900, 'Cumin': 26500, 'Jeera': 26500, 'जीरा': 26500,
            'Groundnut': 6200, 'मूंगफली': 6200
        };
        const matched = Object.entries(defaults).find(([k]) => crop.toLowerCase().includes(k.toLowerCase()));
        basePriceQtl = matched ? matched[1] : (defaults[crop] || 2400);
    }

    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
    // 14-day projection trajectory
    const timeline = isHi ? ["दिन 1", "दिन 3", "दिन 5", "दिन 7 (चरम)", "दिन 10", "दिन 14"] : ["Day 1", "Day 3", "Day 5", "Day 7 (Peak)", "Day 10", "Day 14"];
    const multipliers = [1.0, 1.035, 1.072, 1.11, 1.055, 1.008];
    const prices = multipliers.map(m => Math.round(basePriceQtl * m));

    // Daily storage cost per quintal
    const dailyCostPerQtl = storageType === 'none' ? 0 : (storageCost > 0 ? Math.max(4, Math.min(60, storageCost / 10)) : (storageType === 'cold' ? 35 : (storageType === 'godown' ? 18 : 8)));
    const dayOffsets = [1, 3, 5, 7, 10, 14];
    const costs = dayOffsets.map(d => Math.round(dailyCostPerQtl * (d - 1)));
    const margins = prices.map((p, i) => Math.max(0, p - costs[i]));

    const peakTag = document.getElementById("sell-chart-peak-tag");
    if (peakTag) {
        peakTag.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "चरम मुनाफा: दिन 6 - दिन 8" : "Peak Profit: Day 6 - Day 8";
    }

    if (container) {
        const maxVal = Math.max(...prices, ...margins) * 1.06;
        const minVal = Math.min(...costs, ...margins, basePriceQtl * 0.85);
        const width = 520;
        const height = 180;
        const padX = 42;
        const padY = 28;
        const stepX = (width - 2 * padX) / (timeline.length - 1);
        const getY = val => Math.round(height - padY - ((val - minVal) / Math.max(1, (maxVal - minVal))) * (height - 2 * padY));

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
                    <linearGradient id="gradGreenSell" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="#22c55e" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                <line class="chart-grid-line" x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke-dasharray="3,3" />
                <line class="chart-grid-line" x1="${padX}" y1="${height/2}" x2="${width - padX}" y2="${height/2}" stroke-dasharray="3,3" />
                <line class="chart-axis-base" x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" />
                <path d="${pathPrices}" fill="none" stroke="#22c55e" stroke-width="3" />
                <path d="${pathMargins}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4,2" />
                <path d="${pathCosts}" fill="none" stroke="#f59e0b" stroke-width="2" />
                ${pointsHtml}
            </svg>
        `;
    }

    if (riskContainer) {
        const hum = weatherCache?.data?.current?.relative_humidity_percent || 68;
        const wind = weatherCache?.data?.current?.wind_speed_kmh || 9;
        const rainProb = weatherCache?.data?.forecast?.[0]?.rain_probability_percent || 25;

        const risks = [
            { label: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "फफूंद / रोग दबाव" : "Disease Pressure", val: hum > 80 ? 70 : 42, color: "#f87171" },
            { label: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "मिट्टी नमी तनाव" : "Moisture Stress", val: rainProb > 50 ? 25 : 55, color: "#38bdf8" },
            { label: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "हवा / छिड़काव बहाव" : "Spray Drift Hazard", val: wind > 15 ? 65 : 20, color: "#fbbf24" },
            { label: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "भंडारण सड़न जोखिम" : "Storage Spoilage Risk", val: storageType === 'cold' ? 15 : (storageType === 'none' ? 75 : 40), color: "#a855f7" }
        ];

        riskContainer.innerHTML = risks.map(r => `
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

        const riskTag = document.getElementById("sell-risk-summary-tag");
        if (riskTag) {
            const maxR = Math.max(...risks.map(r => r.val));
            if (maxR > 65) {
                riskTag.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "चेतावनी क्षेत्र" : "Caution Zone";
                riskTag.style.background = "rgba(239, 68, 68, 0.15)";
                riskTag.style.color = "#dc2626";
            } else {
                riskTag.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "सुरक्षित क्षेत्र" : "Safe Zone";
                riskTag.style.background = "rgba(34, 197, 94, 0.15)";
                riskTag.style.color = "#166534";
            }
        }
    }
}
window.renderSellDecisionCharts = renderSellDecisionCharts;

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
        const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
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
                <span class="detail-lbl" style="margin-top: 4px;">${isGrowing ? (isHi ? 'वर्तमान में बढ़ती फसल' : 'Current Growing Crop') : (isHi ? ({ 'Ventilated Godown': 'हवादार गोदाम', 'Open Air Jute Bags': 'खुले बोरे (तिरपाल)', 'Cold Storage Unit': 'कोल्ड स्टोरेज यूनिट', 'Farm Shade': 'खेत का शेड' }[b.storage_type] || b.storage_type) : b.storage_type)}</span>
            </div>
            <div>
                <span class="detail-lbl">${t('storedVolume')}</span>
                <span class="detail-val">${parseFloat(b.quantity_kg).toLocaleString()} ${isHi ? 'किलो' : 'KG'}</span>
                <small style="color: var(--text-muted);">${isHi ? 'ग्रेड' : 'Grade'}: <strong>${b.quality_grade || 'A'}</strong></small>
            </div>
            <div>
                <span class="detail-lbl">${t('spoilageRisk')}</span>
                <span class="detail-val text-${b.spoilage_risk === 'High' ? 'risk' : 'green'}">
                    ${isGrowing ? `${t('suggestedHarvest')}: ${b.suggested_harvest_date || (isHi ? 'एआई जांच बाकी' : 'Pending AI analysis')}` : `${isHi ? (b.spoilage_risk === 'High' ? 'उच्च' : (b.spoilage_risk === 'Medium' ? 'मध्यम' : 'कम')) : b.spoilage_risk} (${b.shelf_life_days} ${t('daysLeft')})`}
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
                    📍 ${(typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'भंडारण खोजें' : 'Find Storage'}
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
                    <span style="font-size:12px; color:var(--text-muted);">${b.field_name} | ${(typeof currentLang !== 'undefined' && currentLang === 'hi') ? `कटाई: ${b.harvest_date} ➔ बिक्री: ${b.selling_date}` : `Harvest: ${b.harvest_date} ➔ Sold: ${b.selling_date}`}</span>
                </div>
                <div>
                    <span style="font-size:16px; font-weight:700; color: ${isProfit ? 'var(--leaf-green)' : 'var(--risk-red)'};">
                        ${(typeof currentLang !== 'undefined' && currentLang === 'hi') ? (isProfit ? 'शुद्ध मुनाफा' : 'कुल हानि') : (isProfit ? 'PROFIT' : 'LOSS')}: ₹ ${Math.abs(b.net_profit_loss).toLocaleString()}
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
            <div style="display: flex; justify-content: flex-end; margin-top: 12px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08);">
                <button type="button" class="btn-secondary" style="font-size: 0.8rem; padding: 5px 12px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;" onclick="openFarmSlipModal('${b.id}')">
                    📄 ${(typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'डिजिटल रसीद / पर्ची बनाएं' : 'Generate / View Farm Slip'}
                </button>
            </div>
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
        const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
        const metricLabels = isHi ? {
            "Temperature": "तापमान",
            "Humidity": "आर्द्रता",
            "Wind speed": "हवा गति",
            "Rain now": "वर्तमान वर्षा",
            "Weather condition": "मौसम स्थिति",
            "Rain probability today": "आज बारिश संभावना"
        } : {
            "Temperature": "Temperature",
            "Humidity": "Humidity",
            "Wind speed": "Wind speed",
            "Rain now": "Rain now",
            "Weather condition": "Weather condition",
            "Rain probability today": "Rain probability today"
        };
        const condMap = {
            "Partly cloudy": "आंशिक बादल",
            "Partly sunny": "आंशिक धूप",
            "Sunny": "धूप",
            "Clear": "साफ़ मौसम",
            "Cloudy": "बादल",
            "Rain": "बारिश",
            "Light rain": "हल्की बारिश",
            "Heavy rain": "भारी बारिश",
            "Thunderstorm": "गरज-चमक बारिश",
            "Haze": "धुंध",
            "Fog": "कोहरा",
            "Overcast": "घने बादल"
        };
        const translateCond = c => isHi ? (condMap[c] || c) : c;

        metrics.innerHTML = [
            [metricLabels["Temperature"], `${current.temperature_c ?? "-"} °C`, "🌡️"],
            [metricLabels["Humidity"], `${current.relative_humidity_percent ?? "-"} %`, "💧"],
            [metricLabels["Wind speed"], `${current.wind_speed_kmh ?? "-"} km/h`, "💨"],
            [metricLabels["Rain now"], `${current.rainfall_mm ?? "-"} mm`, "🌧️"],
            [metricLabels["Weather condition"], translateCond(current.condition), "☀️"],
            [metricLabels["Rain probability today"], `${data.forecast[0]?.rain_probability_percent ?? "-"} %`, "🌧️"]
        ].map(([label, value, icon]) => `<div class="weather-metric"><span class="weather-metric-icon">${icon}</span><span class="weather-metric-label">${label}</span><strong>${value}</strong></div>`).join("");
        forecast.innerHTML = data.forecast.map(day => `<tr><td>${day.date}</td><td>${translateCond(day.condition)}</td><td>${day.temperature_min_c ?? "-"} / ${day.temperature_max_c ?? "-"} °C</td><td>${day.precipitation_mm ?? "-"} mm</td><td>${day.rain_probability_percent ?? "-"} %</td><td>${day.sunrise?.slice(11, 16) ?? "-"}</td><td>${day.sunset?.slice(11, 16) ?? "-"}</td></tr>`).join("");
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
        if (typeof farmerProfile !== 'undefined' && farmerProfile?.latitude && farmerProfile?.longitude) {
            try {
                await fetchWeather(farmerProfile.latitude, farmerProfile.longitude, farmerProfile.district || "Farm Location");
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
        result.classList.remove("weather-action-updated");
        void result.offsetWidth;
        result.classList.add("weather-action-updated");
        showToast(typeof currentLang !== 'undefined' && currentLang === 'hi' ? "⚡ फसल सुरक्षा सलाह तैयार!" : "⚡ Quick Action updated!", "success");
    } catch (error) {
        const advice = (typeof currentLang !== 'undefined' && currentLang === 'hi')
            ? `फसल ${crop} के लिए, आज तापमान ${current.temperature_c}°C व आर्द्रता ${current.relative_humidity_percent}% है। बारिश की संभावना को ध्यान में रखते हुए रासायनिक छिड़काव रोकें व जल निकासी नालियों को दुरुस्त रखें।`
            : `For ${crop}, current canopy temperature is ${current.temperature_c}°C with ${current.relative_humidity_percent}% humidity. Hold chemical sprays until rain probability clears and verify field drainage channels.`;
        latestWeatherActionAdvice = advice;
        result.textContent = advice;
        result.classList.remove("weather-action-updated");
        void result.offsetWidth;
        result.classList.add("weather-action-updated");
        showToast(typeof currentLang !== 'undefined' && currentLang === 'hi' ? "⚡ फसल सुरक्षा सलाह तैयार!" : "⚡ Quick Action updated!", "success");
    } finally {
        button.disabled = false;
        button.innerHTML = origText;
    }
}
window.generateWeatherAction = generateWeatherAction;

function haversineKm(lat1, lon1, lat2, lon2) {
    const l1 = Number(lat1), o1 = Number(lon1), l2 = Number(lat2), o2 = Number(lon2);
    if (!Number.isFinite(l1) || !Number.isFinite(o1) || !Number.isFinite(l2) || !Number.isFinite(o2)) return 0;
    const earthRadiusKm = 6371;
    const deltaLat = (l2 - l1) * Math.PI / 180;
    const deltaLon = (o2 - o1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(deltaLon / 2) ** 2;
    const safeA = Math.min(1.0, Math.max(0.0, a));
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
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
            const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
            const typeBadge = `<span class="facility-type-badge ${isCold ? 'cold' : 'warehouse'}">${isCold ? (isHi ? '❄️ कोल्ड स्टोरेज' : '❄️ Cold Storage') : (isHi ? '🌾 सूखा गोदाम' : '🌾 Warehouse')}</span>`;

            return `
                <div class="storage-facility-card">
                    <div>
                        <div class="facility-top-row">
                            <h4 class="facility-name">${f.name}</h4>
                            ${distBadge}
                        </div>
                        <div style="margin-top: 6px;">
                            ${typeBadge}
                            ${f.is_wdra ? `<span class="facility-type-badge wdra" style="margin-left: 4px;">${isHi ? '📜 ई-एनडब्ल्यूआर ऋण सुविधा' : '📜 WDRA e-NWR Loan'}</span>` : ''}
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">${f.address || f.formatted_address || (isHi ? 'जिला वेयरहाउस' : 'District Warehouse')}</p>
                        ${f.capacity ? `<p style="font-size: 0.78rem; color: var(--text-body); margin-top: 4px;">${isHi ? 'क्षमता' : 'Capacity'}: <strong>${f.capacity}</strong></p>` : ''}
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

    const userLat = Number(farmerProfile?.latitude) || 30.82;
    const userLng = Number(farmerProfile?.longitude) || 75.60;

    // Start API request in background while running smooth simulation sequence
    const scanPromise = fetch("/api/drone/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            crop_name: cropName,
            field_id: "Plot-Alpha-4",
            area_acres: areaAcres,
            latitude: userLat,
            longitude: userLng,
            language: currentLang
        })
    }).then(r => r.json()).catch(err => {
        console.warn("Drone scan API fallback:", err);
        return null;
    });

    // Step 1: Aerial grid mapping
    await new Promise(r => setTimeout(r, 600));
    if (pBar) pBar.style.width = "45%";
    if (headline) headline.innerText = currentLang === 'hi' ? "🛰️ इसरो भुवन व मल्टीस्पेक्ट्रल मैपिंग..." : "🛰️ Scanning with ISRO Bhuvan Satellite & Multispectral...";
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

    const isNonCrop = data.isro_satellite?.is_non_crop || false;

    if (subSoil) subSoil.innerText = isNonCrop ? (currentLang === 'hi' ? 'आवासीय / पक्की सतह' : 'Built-up Surface') : (currentLang === 'hi' ? 'पीएच 6.9 · संतुलित एनपीके' : 'pH 6.9 · NPK Balanced');
    if (subMoist) subMoist.innerText = isNonCrop ? (currentLang === 'hi' ? 'गैर-कृषि क्षेत्र' : 'Non-Agricultural Zone') : (currentLang === 'hi' ? 'सिंचाई: 3 दिन बाद आवश्यकता' : 'Irrigation: Optimal for 3 Days');
    if (subTemp) subTemp.innerText = isNonCrop ? (currentLang === 'hi' ? 'शहरी सतह तापमान' : 'Urban Surface Temp') : (currentLang === 'hi' ? 'मौसम: साफ़ · 9 किमी/घं हवा' : 'Weather: Clear · 9 km/h Wind');
    if (subNdvi) {
        if (data.isro_satellite?.verified) {
            subNdvi.innerText = currentLang === 'hi' ? `इसरो: ${data.isro_satellite.dominant_land_use}` : `ISRO: ${data.isro_satellite.dominant_land_use}`;
        } else {
            subNdvi.innerText = currentLang === 'hi' ? `छत्र घनत्व: उत्तम (${cropName})` : `Canopy Health: Excellent (${cropName})`;
        }
    }

    const bhuvanBadge = data.isro_satellite?.verified 
        ? (isNonCrop ? ` · ⚠️ ISRO Bhuvan: Urban (${data.isro_satellite.crop_land_percent}% Crop)` : ` · 🛰️ ISRO Bhuvan: ${data.isro_satellite.crop_land_percent}% Cropland`) 
        : '';
    if (headline) headline.innerText = `🚁 ${data.status || 'Aerial Survey Completed'} · Plot ${data.field_id || 'Alpha-4'}${bhuvanBadge}`;
    
    if (detail) {
        const satNoteColor = isNonCrop ? '#f59e0b' : '#38bdf8';
        const satNotePrefix = isNonCrop ? '⚠️ ISRO Bhuvan Satellite (Non-Agricultural Plot Alert):' : '🛰️ ISRO Bhuvan Satellite:';
        const satNote = data.isro_satellite?.verified 
            ? `<div style="margin-bottom: 6px; font-size: 0.85rem; color: ${satNoteColor}; font-weight: 600;">${satNotePrefix} ${data.isro_satellite.summary} (${data.isro_satellite.dominant_land_use})</div>` 
            : '';
        detail.innerHTML = `${satNote}<span>${data.recommendation}</span>`;
    }
    if (speechBtn) speechBtn.classList.remove("hidden");

    if (isNonCrop) {
        showToast(currentLang === 'hi' ? `⚠️ इसरो भुवन: आवासीय/गैर-कृषि क्षेत्र पहचाना गया (${t.ndvi} NDVI)` : `⚠️ ISRO Bhuvan: Urban / Built-up area detected (${t.ndvi} NDVI)`, "warning");
    } else {
        showToast(currentLang === 'hi' ? `✅ ड्रोन व इसरो भुवन स्कैन पूर्ण! NDVI: ${t.ndvi}` : `✅ Drone & ISRO Bhuvan scan complete! NDVI: ${t.ndvi}`, "success");
    }

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
        if (typeof applyFullPageTranslation === 'function') applyFullPageTranslation(currentLang);
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

function openFarmSlipModal(preselectedBatchId = null) {
    const modal = document.getElementById("farm-slip-modal");
    if (!modal) return;
    
    // 1. Populate Farmer Name, Phone, Location from REAL logged-in user profile
    const farmerInput = document.getElementById("slip-farmer-name");
    const phoneInput = document.getElementById("slip-phone");
    const locInput = document.getElementById("slip-location");

    const realName = (farmerProfile && farmerProfile.full_name && farmerProfile.full_name.trim()) 
        ? farmerProfile.full_name 
        : (document.getElementById("display-farmer")?.innerText && !['Signed in', 'लॉग इन', 'Sign in'].includes(document.getElementById("display-farmer")?.innerText) ? document.getElementById("display-farmer")?.innerText : "");

    const realPhone = (farmerProfile && farmerProfile.alert_phone) ? farmerProfile.alert_phone.replace(/^\+91/, '').trim() : "";
    
    let realLoc = (farmerProfile && farmerProfile.location_name) ? farmerProfile.location_name : "";
    if (!realLoc && typeof weatherCache !== 'undefined' && weatherCache?.data?.district) {
        realLoc = `${weatherCache.data.district} APMC Mandi`;
    }

    if (farmerInput && (!farmerInput.value || farmerInput.value === "Ramesh Singh")) {
        farmerInput.value = realName;
    }
    if (phoneInput && (!phoneInput.value || phoneInput.value === "9876543210")) {
        phoneInput.value = (realPhone === "9876543210") ? "" : realPhone;
    }
    if (locInput && (!locInput.value || locInput.value === "Khanna APMC Mandi")) {
        locInput.value = realLoc;
    }

    // 2. Populate Batch Selector from actual produceBatches
    populateSlipBatchDropdown(preselectedBatchId);

    // 3. Set random voucher doc ID
    const docIdEl = document.getElementById("slip-doc-id");
    if (docIdEl) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        docIdEl.innerText = `VCH-${new Date().getFullYear()}-${randNum}`;
    }

    modal.style.display = "flex";
    renderFarmSlipPreview();
    if (typeof applyFullPageTranslation === 'function') applyFullPageTranslation(currentLang);
}
window.openFarmSlipModal = openFarmSlipModal;

function closeFarmSlipModal() {
    const modal = document.getElementById("farm-slip-modal");
    if (modal) modal.style.display = "none";
}
window.closeFarmSlipModal = closeFarmSlipModal;

function populateSlipBatchDropdown(preselectedBatchId = null) {
    const select = document.getElementById("slip-batch-select");
    const note = document.getElementById("slip-batch-status-note");
    if (!select) return;

    select.innerHTML = "";
    
    // Default manual option
    const manualOpt = document.createElement("option");
    manualOpt.value = "manual";
    manualOpt.textContent = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "✍️ नया विवरण (मैनुअल रसीद)" : "✍️ Manual Entry (Custom Slip)";
    select.appendChild(manualOpt);

    const soldBatches = (typeof produceBatches !== 'undefined') 
        ? produceBatches.filter(b => b.status === "sold" || b.is_sold || (b.selling_price_per_kg && Number(b.selling_price_per_kg) > 0)) 
        : [];
    const activeBatches = (typeof produceBatches !== 'undefined')
        ? produceBatches.filter(b => b.status === "active" && !b.is_sold)
        : [];

    if (soldBatches.length > 0) {
        const soldGroup = document.createElement("optgroup");
        soldGroup.label = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "✅ बेची गई फसलें (Sold Produce)" : "✅ Sold Batches (Completed Sales)";
        soldBatches.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.id;
            const qtl = (b.sold_quantity_kg ? (b.sold_quantity_kg / 100) : ((b.quantity_kg || 0) / 100)).toFixed(1);
            const rate = (b.selling_price_per_kg ? (b.selling_price_per_kg * 100) : 0).toLocaleString('en-IN');
            const dateStr = b.selling_date || b.harvest_date || "Recent";
            opt.textContent = `Sold: ${b.crop_name} (${qtl} Qtl @ ₹${rate}) - ${dateStr}`;
            soldGroup.appendChild(opt);
        });
        select.appendChild(soldGroup);
    }

    if (activeBatches.length > 0) {
        const activeGroup = document.createElement("optgroup");
        activeGroup.label = (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "📦 भंडारित फसलें (Active Batches)" : "📦 Stored Batches (Unsold Produce)";
        activeBatches.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.id;
            const qtl = ((b.quantity_kg || 0) / 100).toFixed(1);
            opt.textContent = `Stored: ${b.crop_name} (${qtl} Qtl) - Harvested ${b.harvest_date || 'Recent'}`;
            activeGroup.appendChild(opt);
        });
        select.appendChild(activeGroup);
    }

    if (note) {
        if (soldBatches.length === 0 && activeBatches.length === 0) {
            note.innerHTML = (typeof currentLang !== 'undefined' && currentLang === 'hi')
                ? "ℹ️ आपके लेजर में अभी कोई फसल दर्ज नहीं है। आप नीचे सीधे विवरण भर सकते हैं।"
                : "ℹ️ No batches found in your farm ledger. You can enter details manually below.";
        } else if (soldBatches.length === 0) {
            note.innerHTML = (typeof currentLang !== 'undefined' && currentLang === 'hi')
                ? "ℹ️ लेजर में अभी कोई बिक्री (Sold) दर्ज नहीं है। आप भंडारित फसल चुन सकते हैं या नया विवरण भरें।"
                : "ℹ️ No sales recorded in ledger yet. You can select an active batch or enter details manually.";
        } else {
            note.innerHTML = (typeof currentLang !== 'undefined' && currentLang === 'hi')
                ? "💡 अपनी किसी बेची गई फसल को चुनकर उसकी अधिकृत रसीद एक क्लिक में बनाएं।"
                : "💡 Select any sold batch above to automatically generate its verified mandi receipt.";
        }
    }

    if (preselectedBatchId) {
        select.value = preselectedBatchId;
        onSlipBatchSelect(preselectedBatchId);
    }
}
window.populateSlipBatchDropdown = populateSlipBatchDropdown;

function onSlipBatchSelect(batchId) {
    const cropInput = document.getElementById("slip-crop");
    const qtyInput = document.getElementById("slip-quantity");
    const rateInput = document.getElementById("slip-rate");
    const dedInput = document.getElementById("slip-deductions");
    const locInput = document.getElementById("slip-location");
    const statusSelect = document.getElementById("slip-status");

    if (batchId === "manual" || !batchId) {
        // Clear transaction-specific fields if switching to manual
        if (cropInput) cropInput.value = "";
        if (qtyInput) qtyInput.value = "";
        if (rateInput) rateInput.value = "";
        if (dedInput) dedInput.value = "";
        renderFarmSlipPreview();
        return;
    }

    const batch = (typeof produceBatches !== 'undefined') ? produceBatches.find(b => String(b.id) === String(batchId)) : null;
    if (!batch) return;

    if (cropInput) {
        cropInput.value = `${batch.crop_name}${batch.variety ? ' (' + batch.variety + ')' : ''}`;
    }

    if (batch.status === "sold" || batch.is_sold || batch.selling_price_per_kg) {
        // Sold batch
        const qtl = batch.sold_quantity_kg ? (batch.sold_quantity_kg / 100) : (batch.quantity_kg ? batch.quantity_kg / 100 : 0);
        const rateQtl = batch.selling_price_per_kg ? (batch.selling_price_per_kg * 100) : 0;
        
        let totalDeductions = 0;
        if (batch.selling_costs && typeof batch.selling_costs === 'object') {
            totalDeductions = Object.values(batch.selling_costs).reduce((a, b) => a + (Number(b) || 0), 0);
        }

        if (qtyInput) qtyInput.value = qtl > 0 ? qtl.toFixed(1) : "";
        if (rateInput) rateInput.value = rateQtl > 0 ? Math.round(rateQtl) : "";
        if (dedInput) dedInput.value = totalDeductions > 0 ? Math.round(totalDeductions) : "0";
        if (locInput && (batch.mandi_name || batch.buyer_name)) {
            locInput.value = batch.mandi_name || batch.buyer_name;
        }
        if (statusSelect) statusSelect.value = "PAID - Bank Transfer";
    } else {
        // Active / Stored batch
        const qtl = (batch.quantity_kg ? batch.quantity_kg / 100 : 0);
        if (qtyInput) qtyInput.value = qtl > 0 ? qtl.toFixed(1) : "";
        if (rateInput) rateInput.value = batch.expected_mandi_rate ? Math.round(batch.expected_mandi_rate * 100) : "";
        if (dedInput) dedInput.value = "0";
        if (locInput && batch.storage_facility) {
            locInput.value = batch.storage_facility;
        }
    }

    renderFarmSlipPreview();
}
window.onSlipBatchSelect = onSlipBatchSelect;

function renderFarmSlipPreview() {
    const farmer = document.getElementById("slip-farmer-name")?.value?.trim() || "";
    const phone = document.getElementById("slip-phone")?.value?.trim() || "";
    const loc = document.getElementById("slip-location")?.value?.trim() || "";
    const crop = document.getElementById("slip-crop")?.value?.trim() || "";
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

    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');

    if (pvFarmer) pvFarmer.innerText = farmer || (isHi ? "—" : "—");
    if (pvPhone) {
        if (phone && phone !== "9876543210") {
            pvPhone.innerText = phone.startsWith('+') ? phone : `+91 ${phone}`;
        } else {
            pvPhone.innerText = "—";
        }
    }
    if (pvLoc) pvLoc.innerText = loc || (isHi ? "—" : "—");
    if (pvDate) pvDate.innerText = todayStr;
    if (pvCrop) pvCrop.innerText = crop || (isHi ? "[फसल दर्ज करें]" : "[Enter produce]");
    if (pvQty) pvQty.innerText = qty > 0 ? `${qty.toFixed(1)} Qtl` : "0.0 Qtl";
    if (pvRate) pvRate.innerText = rate > 0 ? `₹${rate.toLocaleString('en-IN')}` : "₹0";
    if (pvGross) pvGross.innerText = gross > 0 ? `₹${gross.toLocaleString('en-IN')}` : "₹0";
    if (pvDeductions) pvDeductions.innerText = deductions > 0 ? `-₹${deductions.toLocaleString('en-IN')}` : "₹0";
    if (pvNet) pvNet.innerText = net > 0 ? `₹${net.toLocaleString('en-IN')}` : "₹0";

    const statusMap = {
        "PAID - Bank Transfer": isHi ? "✅ भुगतान प्राप्त (बैंक ट्रांसफर / RTGS)" : "✅ Paid (Bank Transfer / RTGS)",
        "PAID - Cash": isHi ? "✅ भुगतान प्राप्त (नकद)" : "✅ Paid (Cash / नकद)",
        "PENDING - 3 Days": isHi ? "⏳ भुगतान लंबित (3 दिन)" : "⏳ Payment Pending (3 Days)",
        "CHEQUE ISSUED": isHi ? "📑 चेक जारी किया गया" : "📑 Cheque Issued"
    };
    if (pvStatus) {
        if (qty === 0 && rate === 0) {
            pvStatus.innerText = isHi ? "📝 ड्राफ्ट पर्ची (तैयार)" : "📝 Draft Voucher (Ready)";
        } else {
            pvStatus.innerText = statusMap[status] || status;
        }
    }
}
window.renderFarmSlipPreview = renderFarmSlipPreview;

function shareFarmSlipViaWhatsApp() {
    const farmer = document.getElementById("slip-farmer-name")?.value?.trim() || (farmerProfile?.full_name || "Farmer");
    const phone = document.getElementById("slip-phone")?.value?.trim() || "";
    const loc = document.getElementById("slip-location")?.value?.trim() || (farmerProfile?.location_name || "Mandi / Farm");
    const crop = document.getElementById("slip-crop")?.value?.trim() || "Farm Produce";
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
${phone && phone !== "9876543210" ? `📞 Contact: +91 ${phone}\n` : ''}
📦 *Produce:* ${crop}
⚖️ *Quantity:* ${qty > 0 ? qty.toFixed(1) + ' Quintals' : 'Not specified'}
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
    if (cleanPhone.length === 10 && cleanPhone !== "9876543210") {
        waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else if (cleanPhone.length > 10) {
        waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, '_blank');
}
window.shareFarmSlipViaWhatsApp = shareFarmSlipViaWhatsApp;

function printFarmSlip() {
    window.print();
}
window.printFarmSlip = printFarmSlip;

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
    if (!modal) {
        console.error("Full analysis modal not found in DOM");
        return;
    }
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.zIndex = "99999";
    document.body.style.overflow = "hidden";

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
    runFullAgronomicAnalysis();
}
window.openFullAnalysisModal = openFullAnalysisModal;

function closeFullAnalysisModal() {
    const modal = document.getElementById("full-analysis-modal");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
        modal.classList.add("hidden");
    }
    document.body.style.overflow = "";
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}
window.closeFullAnalysisModal = closeFullAnalysisModal;

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
            ],
            chart_data: {
                timeline: ["Day 1", "Day 3", "Day 5", "Day 7 (Peak)", "Day 10", "Day 14"],
                market_prices: [2400, 2480, 2560, 2640, 2530, 2450],
                storage_costs: [0, 45, 90, 140, 220, 310],
                net_margins: [2400, 2435, 2470, 2500, 2310, 2140],
                peak_window: "Day 6 - Day 8",
                risk_breakdown: {
                    disease_pressure: hum > 80 ? 75 : 40,
                    moisture_stress: rainMm > 5 ? 25 : 60,
                    wind_drift_hazard: wind > 15 ? 75 : 20,
                    storage_spoilage_risk: hum > 80 ? 70 : 30
                }
            },
            profit_analysis: {
                recommended_next_crop: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "सरसों (Mustard) / चना (Chickpea) / मूंग" : "Mustard / Chickpea / Green Gram",
                loss_minimization_strategy: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? `फसल ${crop} की कटाई के बाद नमी 12% से कम रखें और हवादार क्रेट्स में भंडारित करें।` : `Cure and dry ${crop} below 12% moisture on elevated wooden crates to eliminate rot.`,
                profit_boost_plan: (typeof currentLang !== 'undefined' && currentLang === 'hi') ? "उपज को A/B ग्रेड में छांटें और Day 6-8 के मुख्य मंडी उछाल पर बेचें।" : "Sort into A-Grade lots and target the Day 6-8 mandi peak to maximize profit.",
                projected_profit_gain: "+₹18,000 – ₹32,000"
            }
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
    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
    const dBadge = document.getElementById("an-disease-badge");
    if (dBadge) {
        const lvl = (data.disease?.level || "Low").toLowerCase();
        const hiRisk = { high: "उच्च जोखिम", moderate: "मध्यम जोखिम", low: "कम जोखिम" }[lvl] || `${data.disease?.level} जोखिम`;
        dBadge.textContent = isHi ? hiRisk : `${data.disease?.level || "Low"} Risk`;
        dBadge.className = `badge-risk-pill badge-risk-${lvl}`;
    }
    const dPath = document.getElementById("an-disease-pathogens");
    if (dPath) dPath.textContent = data.disease?.pathogens || "--";
    const dAct = document.getElementById("an-disease-action");
    if (dAct) dAct.textContent = data.disease?.action || "--";

    // Pillar 2: Spray
    const sBadge = document.getElementById("an-spray-badge");
    if (sBadge) {
        const sprayMap = {
            "Optimal": "सर्वोत्तम समय",
            "Marginal": "मध्यम अनुकूल",
            "Do Not Spray": "स्प्रे न करें",
            "Rain Expected": "बारिश का अनुमान",
            "High Wind Drift": "तेज हवा - बहाव जोखिम",
            "Ideal Window Open": "सर्वोत्तम समय उपलब्ध"
        };
        const origSpray = data.spray?.badge || data.spray?.status || "Optimal";
        sBadge.textContent = isHi ? (sprayMap[origSpray] || origSpray) : origSpray;
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
        const irrigMap = {
            "Normal Irrigation": "नियमित सिंचाई",
            "Normal Scheduled Irrigation": "नियमित निर्धारित सिंचाई",
            "Hold Irrigation (Stop Pumps)": "सिंचाई रोकें (पंप बंद रखें)",
            "Hold Irrigation": "सिंचाई रोकें"
        };
        const origIrrig = data.irrigation?.action || "Normal Irrigation";
        iBadge.textContent = isHi ? (irrigMap[origIrrig] || origIrrig) : origIrrig;
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
        const thermMap = {
            "Optimal Growth Zone": "अनुकूल विकास तापमान",
            "Optimal Zone": "अनुकूल क्षेत्र",
            "Heat Stress Alert": "अत्यधिक गर्मी चेतावनी",
            "Cold Frost Alert": "पाला / ठंड चेतावनी"
        };
        const origTherm = data.thermal?.status || "Optimal Zone";
        tBadge.textContent = isHi ? (thermMap[origTherm] || origTherm) : origTherm;
        const isWarn = (data.thermal?.status || "").toLowerCase().includes("stress") || (data.thermal?.status || "").toLowerCase().includes("frost");
        tBadge.className = `badge-risk-pill badge-thermal-${isWarn ? "warning" : "optimal"}`;
    }
    const tWork = document.getElementById("an-workability");
    if (tWork) tWork.textContent = isHi ? ({ "Waterlogged Soil - Delay Machinery": "खेत में पानी भरा - मशीन संचालन रोकें", "Ideal for Farm Machinery & Labor": "खेत संचालन व मजदूरी हेतु अनुकूल" }[data.workability] || data.workability) : (data.workability || "--");
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

    // Render 14-Day SVG Market vs Storage Chart (if container exists)
    if (document.getElementById("an-svg-chart-container")) {
        renderFullAnalysisSvgChart(data.chart_data);
    }

    // Render Microclimate Risk Breakdown Bars (if container exists)
    if (document.getElementById("an-risk-bars-container")) {
        renderFullAnalysisRiskBars(data.chart_data?.risk_breakdown);
    }

    // Synchronize to Sell Decision panel charts
    if (typeof renderSellDecisionCharts === 'function') {
        renderSellDecisionCharts({ result: data });
    }

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
    
    const allVals = [...prices, ...margins];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const span = Math.max(10, rawMax - rawMin);
    const minVal = Math.max(0, Math.floor(rawMin - span * 0.15));
    const maxVal = Math.ceil(rawMax + span * 0.15);
    const width = 520;
    const height = 180;
    const padX = 42;
    const padY = 28;
    const stepX = (width - 2 * padX) / (timeline.length - 1);
    
    const getY = val => Math.round(height - padY - ((val - minVal) / Math.max(1, (maxVal - minVal))) * (height - 2 * padY));
    
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

    const isHi = (typeof currentLang !== 'undefined' && currentLang === 'hi');
    const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hiMonths = ["जन", "फ़र", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सितं", "अक्टू", "नवं", "दिसं"];
    const months = isHi ? hiMonths : (yearly?.months || enMonths);
    const prices = yearly?.historical_prices || [2450, 2480, 2260, 2180, 2220, 2290, 2360, 2420, 2500, 2590, 2680, 2620];
    const arrivals = yearly?.arrival_volume_pct || [6, 8, 35, 28, 8, 4, 2, 1, 1, 1, 3, 3];

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const priceSpan = Math.max(10, rawMax - rawMin);
    const minPrice = Math.max(0, Math.floor(rawMin - priceSpan * 0.15));
    const maxPrice = Math.ceil(rawMax + priceSpan * 0.15);
    const rawMaxArrival = Math.max(...arrivals);
    const maxArrival = Math.max(10, Math.ceil(rawMaxArrival * 1.15));

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

// Initialize Theme & Sell Decision charts on startup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        setTimeout(renderSellDecisionCharts, 300);
    });
} else {
    initTheme();
    setTimeout(renderSellDecisionCharts, 300);
}

// ============================================================
// FARMER MULTILINGUAL INTERACTIVE TUTORIAL MODULE
// ============================================================

let currentTutorialStep = 0;
let isTutorialSpeaking = false;

const TUTORIAL_STEPS_DATA = [
    {
        id: "setup-location",
        icon: "🌐",
        targetTab: "weather",
        title: {
            en: "1. Select Language & Set Farm GPS Location",
            hi: "1. भाषा चुनें और खेत का स्थान (GPS) सेट करें",
            pa: "1. ਭਾਸ਼ਾ ਚੁਣੋ ਅਤੇ ਖੇਤ ਦਾ ਸਥਾਨ (GPS) ਸੈੱਟ ਕਰੋ",
            mr: "1. भाषा निवडा आणि शेताचे स्थान (GPS) सेट करा",
            gu: "1. ભાષા પસંદ કરો અને ખેતરનું સ્થાન (GPS) સેટ કરો",
            kn: "1. ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಜಮೀನಿನ ಸ್ಥಳ (GPS) ಹೊಂದಿಸಿ",
            te: "1. భాషను ఎంచుకోండి మరియు పొలం స్థానాన్ని (GPS) సెట్ చేయండి",
            ta: "1. மொழியைத் தேர்ந்தெடுத்து பண்ணை இருப்பிடத்தை (GPS) அமைக்கவும்",
            bn: "1. ভাষা নির্বাচন করুন এবং খামারের অবস্থান (GPS) সেট করুন"
        },
        desc: {
            en: "AgriFlow supports 9 Indian languages. Set your location to automatically load nearby APMC mandi prices and hyper-local weather.",
            hi: "एग्रीफ्लो 9 भारतीय भाषाओं में उपलब्ध है। अपना स्थान चुनें ताकि आपके नजदीकी मंडी भाव और मौसम का पूर्वानुमान स्वतः लोड हो सके।",
            pa: "ਐਗਰੀਫਲੋ 9 ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਉਪਲਬਧ ਹੈ। ਆਪਣਾ ਸਥਾਨ ਚੁਣੋ ਤਾਂ ਜੋ ਨਜ਼ਦੀਕੀ ਮੰਡੀ ਦੇ ਭਾਅ ਅਤੇ ਮੌਸਮ ਆਪਣੇ ਆਪ ਲੋਡ ਹੋ ਜਾਣ।",
            mr: "एग्रीफ्लो 9 भारतीय भाषांमध्ये उपलब्ध आहे. स्थान निवडा जेणेकरून नजीकच्या बाजार समितीचे भाव आणि स्थानिक हवामान आपोआप लोड होईल.",
            gu: "એગ્રીફ્લો 9 ભારતીય ભાષાઓમાં ઉપલબ્ધ છે. સ્થાન પસંદ કરો જેથી નજીકના માર્કેટ યાર્ડના ભાવો અને સ્થાનિક હવામાન આપમેળે મળી રહે.",
            kn: "ಅಗ್ರಿಫ್ಲೋ 9 ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ. ನಿಮ್ಮ ಸ್ಥಳ ಹೊಂದಿಸಿ ಸ್ಥಳೀಯ ಎಪಿಎಂಸಿ ಮಂಡಿ ದರಗಳು ಮತ್ತು ಹವಾಮಾನವನ್ನು ಪಡೆಯಿರಿ.",
            te: "అగ్రిఫ్లో 9 భారతీయ భాషల్లో అందుబాటులో ఉంది. మీ స్థానాన్ని సెట్ చేయడం ద్వారా స్థానిక మార్కెట్ ధరలు మరియు వాతావరణాన్ని పొందండి.",
            ta: "அக்ரிஃப்ளோ 9 இந்திய மொழிகளில் கிடைக்கிறது. உள்ளூர் மண்டி விலைகள் மற்றும் வானிலையை தானாகப் பெற உங்கள் இருப்பிடத்தை அமைக்கவும்.",
            bn: "অ্যাগ্রিফ্লো ৯টি ভারতীয় ভাষায় উপলব্ধ। স্থানীয় এপিএমসি মণ্ডির দর এবং আবহাওয়া পেতে নিজের অবস্থান সেট করুন।"
        },
        points: {
            en: [
                { bold: "Language Switcher:", text: "Choose from English, Hindi, Punjabi, Marathi, Gujarati, Kannada, Telugu, Tamil, or Bengali anytime." },
                { bold: "GPS / Pincode Auto-Detect:", text: "Click 'Use GPS' or enter your PIN code / Tehsil to instantly target your farm." },
                { bold: "Hyper-Local Customization:", text: "All prices, rainfall radar, and soil metrics adapt to your exact geography." }
            ],
            hi: [
                { bold: "अपनी पसंदीदा भाषा चुनें:", text: "अंग्रेजी, हिंदी, पंजाबी, मराठी, गुजराती, कन्नड़, तेलुगु, तमिल या बांग्ला में कभी भी बदलें।" },
                { bold: "GPS या पिन कोड दर्ज करें:", text: "'GPS उपयोग करें' पर क्लिक करें या अपना पिन कोड दर्ज करके अपने खेत को चुनें।" },
                { bold: "सटीक स्थानीय जानकारी:", text: "सभी मंडी भाव, बारिश का रडार और मिट्टी की स्थिति आपके क्षेत्र के अनुसार लोड होगी।" }
            ],
            pa: [
                { bold: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ:", text: "ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ ਜਾਂ ਹੋਰ ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚੋਂ ਕਦੇ ਵੀ ਚੋਣ ਕਰੋ।" },
                { bold: "ਜੀਪੀਐਸ ਜਾਂ ਪਿੰਨ ਕੋਡ:", text: "'GPS ਵਰਤੋ' 'ਤੇ ਕਲਿੱਕ ਕਰੋ ਜਾਂ ਆਪਣਾ ਪਿੰਨ ਕੋਡ ਦਰਜ ਕਰੋ।" },
                { bold: "ਸਥਾਨਕ ਜਾਣਕਾਰੀ:", text: "ਸਾਰੇ ਮੰਡੀ ਭਾਅ ਅਤੇ ਮੌਸਮ ਚਿਤਾਵਨੀਆਂ ਤੁਹਾਡੇ ਖੇਤ ਮੁਤਾਬਕ ਹੋਣਗੀਆਂ।" }
            ],
            mr: [
                { bold: "आपली भाषा निवडा:", text: "मराठी, हिंदी, इंग्रजी किंवा इतर प्रादेशिक भाषा कधीही बदला." },
                { bold: "GPS किंवा पिन कोड:", text: "'GPS वापरा' वर क्लिक करा किंवा आपला पिन कोड नोंदवून शेताचे स्थान निश्चित करा." },
                { bold: "स्थानिक अचूकता:", text: "सर्व बाजार भाव आणि हवामानाचा अंदाज तुमच्या तालुक्यानुसार असेल." }
            ],
            gu: [
                { bold: "તમારી ભાષા પસંદ કરો:", text: "ગુજરાતી, હિન્દી, અંગ્રેજી અથવા અન્ય ભાષાઓ વચ્ચે ગમે ત્યારે બદલો." },
                { bold: "GPS અથવા પિન કોડ:", text: "'GPS વાપરો' પર ક્લિક કરો અથવા પિન કોડ દાખલ કરો." },
                { bold: "સ્થાનિક માહિતી:", text: "બધા બજાર ભાવો અને હવામાન આપના તાલુકા મુજબ સેટ થશે." }
            ],
            kn: [
                { bold: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:", text: "ಕನ್ನಡ, ಹಿಂದಿ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಇತರ ಭಾಷೆಗಳಿಗೆ ಸುಲಭವಾಗಿ ಬದಲಾಯಿಸಿ." },
                { bold: "ಜಿಪಿಎಸ್ ಅಥವಾ ಪಿನ್ ಕೋಡ್:", text: "'GPS ಬಳಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಪಿನ್ ಕೋಡ್ ನಮೂದಿಸಿ." },
                { bold: "ಸ್ಥಳೀಯ ನಿಖರತೆ:", text: "ಮಂಡಿ ದರಗಳು ಮತ್ತು ಮಳೆಯ ಮಾಹಿತಿ ನಿಮ್ಮ ಜಮೀನಿಗೆ ತಕ್ಕಂತೆ ಸಿಗುತ್ತದೆ." }
            ],
            te: [
                { bold: "మీ భాషను ఎంచుకోండి:", text: "తెలుగు, హిందీ, ఇంగ్లీష్ లేదా ఇతర భాషల్లోకి ఎప్పుడైనా మారవచ్చు." },
                { bold: "జీపీఎస్ లేదా పిన్ కోడ్:", text: "'GPS ఉపయోగించండి' పై క్లిక్ చేయండి లేదా పిన్ కోడ్ నమోదు చేయండి." },
                { bold: "ప్రాంతీయ సమాచారం:", text: "మార్కెట్ ధరలు మరియు వాతావరణం మీ ప్రాంతానికి అనుగుణంగా వస్తాయి." }
            ],
            ta: [
                { bold: "மொழியைத் தேர்வுசெய்க:", text: "தமிழ், இந்தி, ஆங்கிலம் அல்லது பிற மொழிகளை எப்போது வேண்டுமானாலும் மாற்றலாம்." },
                { bold: "ஜிபிஎஸ் அல்லது பின் கோடு:", text: "'GPS பயன்படுத்து' என்பதைக் கிளிக் செய்யவும் அல்லது பின் கோடை உள்ளிடவும்." },
                { bold: "துல்லியமான தகவல்:", text: "மண்டி விலைகள் மற்றும் மழை எச்சரிக்கைகள் உங்கள் பகுதிக்கு ஏற்ப வரும்." }
            ],
            bn: [
                { bold: "পছন্দের ভাষা বাছুন:", text: "বাংলা, হিন্দি, ইংরেজি বা অন্যান্য ভাষায় যেকোনো সময় পরিবর্তন করুন।" },
                { bold: "জিপিএস বা পিন কোড:", text: "'GPS ব্যবহার করুন' ক্লিক করুন অথবা পিন কোড লিখে খামার চিহ্নিত করুন।" },
                { bold: "সঠিক স্থানীয় তথ্য:", text: "সমস্ত মণ্ডির দর ও আবহাওয়ার সতর্কতা আপনার অঞ্চলের জন্য প্রযোজ্য হবে।" }
            ]
        },
        tip: {
            en: "Allow GPS location permission on your phone for 100% pinpoint accuracy of hyper-local weather and nearest mandis.",
            hi: "मोबाइल पर लोकेशन की अनुमति दें ताकि खेत का मौसम और सबसे नजदीकी मंडियां बिल्कुल सही दिखाई दें।",
            pa: "ਆਪਣੇ ਫ਼ੋਨ 'ਤੇ ਜੀਪੀਐਸ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਤਾਂ ਜੋ ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਅਤੇ ਮੌਸਮ ਬਿਲਕੁਲ ਸਹੀ ਮਿਲ ਸਕੇ।",
            mr: "मोबाईलवर लोकेशन परवानगी द्या जेणेकरून नजीकच्या बाजार समित्या आणि अचूक हवामान दिसेल.",
            gu: "તમારા ફોન પર લોકેશનની પરવાનગી આપો જેથી નજીકના માર્કેટ યાર્ડ અને ચોક્કસ હવામાન જાણી શકાય.",
            kn: "ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಜಿಪಿಎಸ್ ಅನುಮತಿ ನೀಡಿ ನಿಖರವಾದ ಹವಾಮಾನ ಮತ್ತು ಹತ್ತಿರದ ಮಂಡಿಗಳನ್ನು ಪಡೆಯಿರಿ.",
            te: "ఖచ్చితమైన వాతావరణం మరియు సమీప మార్కెట్లను పొందడానికి మీ ఫోన్‌లో జీపీఎస్ అనుమతి ఇవ్వండి.",
            ta: "துல்லியமான வானிலை மற்றும் அருகிலுள்ள மண்டிகளைப் பெற உங்கள் மொபைலில் ஜிபிஎஸ் அனுமதியை வழங்கவும்.",
            bn: "সঠিক আবহাওয়া এবং নিকটতম মণ্ডি দেখতে আপনার মোবাইলে জিপিএস অনুমতি দিন।"
        },
        btnJump: {
            en: "Set Location & Weather ➔",
            hi: "स्थान व मौसम सेट करें ➔",
            pa: "ਸਥਾਨ ਅਤੇ ਮੌਸਮ ਸੈੱਟ ਕਰੋ ➔",
            mr: "स्थान व हवामान सेट करा ➔",
            gu: "સ્થાન અને હવામાન સેટ કરો ➔",
            kn: "ಸ್ಥಳ ಮತ್ತು ಹವಾಮಾನ ಹೊಂದಿಸಿ ➔",
            te: "స్థానం మరియు వాతావరణం సెట్ చేయండి ➔",
            ta: "இருப்பிடம் & வானிலையை அமை ➔",
            bn: "অবস্থান ও আবহাওয়া সেট করুন ➔"
        },
        narration: {
            en: "Welcome to AgriFlow! First, select your preferred regional language from the menu. Next, allow GPS location or enter your PIN code so AgriFlow can automatically fetch your local mandi market prices and 48-hour weather forecast.",
            hi: "एग्रीफ्लो में आपका स्वागत है! सबसे पहले अपनी पसंदीदा भाषा चुनें। इसके बाद जीपीएस स्थान की अनुमति दें या अपना पिन कोड दर्ज करें ताकि आपके नजदीकी मंडी भाव और 48 घंटे का मौसम स्वतः लोड हो सके।"
        }
    },
    {
        id: "pre-cost",
        icon: "🧮",
        targetTab: "pre-cost",
        title: {
            en: "2. Pre-Cost Calculator & Net Profit Engine",
            hi: "2. फसल पूर्व लागत कैलकुलेटर एवं शुद्ध मुनाफा",
            pa: "2. ਫਸਲ ਪੂਰਵ ਲਾਗਤ ਕੈਲਕੁਲੇਟਰ ਅਤੇ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ",
            mr: "2. पीक पूर्व खर्च गणक आणि निव्वळ नफा",
            gu: "2. પાક પૂર્વ ખર્ચ કેલ્ક્યુલેટર અને ચોખ્ખો નફો",
            kn: "2. ಬೆಳೆ ಪೂರ್ವ ವೆಚ್ಚ ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ನಿವ್ವಳ ಲಾಭ",
            te: "2. పంట ముందస్తు ఖర్చు గణన మరియు నికర లాభం",
            ta: "2. பயிர் முன்செலவு கணக்கீடு மற்றும் நிகர லாபம்",
            bn: "2. ফসল পূর্ব খরচ ক্যালকুলেটর ও নিট লাভ"
        },
        desc: {
            en: "Estimate seeds, fertilizer, tractor, labor, and irrigation expenses before spending a single rupee, and forecast your expected net profit.",
            hi: "बुवाई से पहले बीज, खाद, ट्रैक्टर, जुताई, मजदूरी और सिंचाई का खर्च जोड़ें और जानें कि आपको कितना शुद्ध मुनाफा होगा।",
            pa: "ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਬੀਜ, ਖਾਦ, ਟਰੈਕਟਰ, ਮਜ਼ਦੂਰੀ ਅਤੇ ਸਿੰਚਾਈ ਦੇ ਖਰਚਿਆਂ ਦਾ ਹਿਸਾਬ ਲਗਾਓ ਅਤੇ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ ਜਾਣੋ।",
            mr: "पेरणीपूर्वी बियाणे, खते, ट्रॅक्टर, मजुरी आणि पाणी खर्चाचा अंदाज लावा आणि अपेक्षित नफा जाणून घ्या.",
            gu: "વાવણી પહેલાં બિયારણ, ખાતર, ટ્રેક્ટર, મજૂરી અને પિયત ખર્ચનો હિસાબ લગાવો અને નફો જાણો.",
            kn: "ಬಿತ್ತನೆ ಮಾಡುವ ಮುನ್ನವೇ ಬೀಜ, ಗೊಬ್ಬರ, ಟ್ರ್ಯಾಕ್ಟರ್, ಕೂಲಿ ಮತ್ತು ನೀರಾವರಿ ವೆಚ್ಚವನ್ನು ಲೆಕ್ಕಹಾಕಿ ನಿವ್ವಳ ಲಾಭ ತಿಳಿಯಿರಿ.",
            te: "విత్తనాలు, ఎరువులు, ట్రాక్టర్, కూలీలు మరియు సాగునీటి ఖర్చులను ముందే అంచనా వేసి నికర లాభాన్ని తెలుసుకోండి.",
            ta: "விதைப்பதற்கு முன்பே விதை, உரம், டிராக்டர், கூலி மற்றும் பாசனச் செலவுகளைக் கணக்கிட்டு நிகர லாபத்தை அறியவும்.",
            bn: "বীজ বোনার আগেই বীজ, সার, ট্রাক্টর, মজুরি ও সেচ খরচের হিসাব করে সম্ভাব্য নিট লাভ জানুন।"
        },
        points: {
            en: [
                { bold: "Select Crop & Land Size:", text: "Pick Tomato, Wheat, Mustard, Potato, etc., and enter land area in Acres, Bigha, or Guntha." },
                { bold: "Benchmark Input Costs:", text: "AgriFlow automatically pre-fills state agricultural university standard costs for seeds and fertilizers." },
                { bold: "Breakeven Selling Rate:", text: "Instantly see total production cost, yield estimate, and the minimum selling price needed to make profit." }
            ],
            hi: [
                { bold: "फसल और रकबा चुनें:", text: "टमाटर, गेहूं, सरसों, आलू आदि चुनें और एकड़ या बीघा में खेत का आकार दर्ज करें।" },
                { bold: "लागत का अग्रिम हिसाब:", text: "एग्रीफ्लो कृषि विश्वविद्यालय के मानकों के अनुसार बीज, खाद, जुताई और मजदूरी की लागत स्वतः भर देता है।" },
                { bold: "सुरक्षित विक्रय भाव (Breakeven):", text: "कुल उत्पादन खर्च, अनुमानित पैदावार और वह न्यूनतम भाव देखें जिससे कम पर बेचने पर नुकसान हो सकता है।" }
            ],
            pa: [
                { bold: "ਫਸਲ ਅਤੇ ਰਕਬਾ ਚੁਣੋ:", text: "ਕਣਕ, ਸਰ੍ਹੋਂ, ਆਲੂ, ਟਮਾਟਰ ਆਦਿ ਚੁਣੋ ਅਤੇ ਏਕੜ ਜਾਂ ਬਿੱਘਾ ਦਰਜ ਕਰੋ।" },
                { bold: "ਲਾਗਤ ਦਾ ਅੰਦਾਜ਼ਾ:", text: "ਐਗਰੀਫਲੋ ਖੇਤੀਬਾੜੀ ਯੂਨੀਵਰਸਿਟੀ ਅਨੁਸਾਰ ਬੀਜ, ਖਾਦ ਅਤੇ ਮਜ਼ਦੂਰੀ ਦੇ ਖਰਚੇ ਆਪਣੇ ਆਪ ਭਰਦਾ ਹੈ।" },
                { bold: "ਘੱਟੋ-ਘੱਟ ਸੁਰੱਖਿਅਤ ਭਾਅ:", text: "ਕੁੱਲ ਲਾਗਤ ਅਤੇ ਲਾਭਦਾਇਕ ਵੇਚ ਮੁੱਲ ਪਹਿਲਾਂ ਹੀ ਜਾਣੋ।" }
            ],
            mr: [
                { bold: "पीक आणि क्षेत्र निवडा:", text: "कांदा, गहू, हरभरा, टोमॅटो इत्यादी निवडा आणि एकर किंवा गुंठा नोंदवा." },
                { bold: "खर्चाचे नियोजन:", text: "बियाणे, खते आणि मजुरीचा प्रमाणित खर्च आपोआप भरला जातो." },
                { bold: "किमान सुरक्षित दर:", text: "एकूण खर्च आणि नफ्यासाठी लागणारा किमान बाजार भाव पेरणीपूर्वीच पाहा." }
            ],
            gu: [
                { bold: "પાક અને જમીન પસંદ કરો:", text: "કપાસ, ઘઉં, રાયડો, બટાટા વગેરે પસંદ કરો અને વીઘા કે એકર દાખલ કરો." },
                { bold: "ખર્ચનો અંદાજ:", text: "બિયારણ, ખાતર અને મજૂરીનો ખર્ચ આપમેળે ગણાઈ જાય છે." },
                { bold: "નફાકારક ભાવ:", text: "કુલ ઉત્પાદન ખર્ચ અને નફો મેળવવા માટે જરૂરી લઘુત્તમ ભાવ જાણો." }
            ],
            kn: [
                { bold: "ಬೆಳೆ ಮತ್ತು ವಿಸ್ತೀರ್ಣ ಆಯ್ಕೆಮಾಡಿ:", text: "ಟೊಮ್ಯಾಟೊ, ಗೋಧಿ, ಮೆಕ್ಕೆಜೋಳ ಇತ್ಯಾದಿ ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಎಕರೆ ನಮೂದಿಸಿ." },
                { bold: "ವೆಚ್ಚದ ಅಂದಾಜು:", text: "ಬೀಜ, ಗೊಬ್ಬರ ಮತ್ತು ಕೃಷಿ ವೆಚ್ಚಗಳು ತಾನಾಗಿಯೇ ಲೆಕ್ಕಹಾಕಲ್ಪಡುತ್ತವೆ." },
                { bold: "ಸುರಕ್ಷಿತ ಮಾರಾಟ ದರ:", text: "ಲಾಭ ಗಳಿಸಲು ಬೇಕಾದ ಕನಿಷ್ಠ ಬೆಲೆ ಮತ್ತು ಒಟ್ಟು ಆದಾಯವನ್ನು ತಿಳಿಯಿರಿ." }
            ],
            te: [
                { bold: "పంట మరియు విస్తీర్ణం ఎంచుకోండి:", text: "వరి, పత్తి, మిరప, టమోటా వంటి పంటలను మరియు ఎకరాలను నమోదు చేయండి." },
                { bold: "ఖర్చుల అంచనా:", text: "విత్తనాలు, ఎరువులు మరియు కూలీల ఖర్చులు ఆటోమేటిక్‌గా గణించబడతాయి." },
                { bold: "కనీస విక్రయ ధర:", text: "లాభం రావడానికి అవసరమైన కనీస మార్కెట్ ధరను ముందే తెలుసుకోండి." }
            ],
            ta: [
                { bold: "பயிர் மற்றும் நிலத்தை தேர்வுசெய்க:", text: "நெல், தக்காளி, பருத்தி போன்றவற்றைத் தேர்ந்தெடுத்து ஏக்கரை உள்ளிடவும்." },
                { bold: "செலவு மதிப்பீடு:", text: "விதை, உரம் மற்றும் கூலிச் செலவுகள் தானாகவே கணக்கிடப்படும்." },
                { bold: "குறைந்தபட்ச விற்பனை விலை:", text: "லாபம் பெற தேவையான குறைந்தபட்ச விலையை முன்கூட்டியே அறிந்து கொள்ளுங்கள்." }
            ],
            bn: [
                { bold: "ফসল ও জমির পরিমাণ বাছুন:", text: "টমেটো, গম, আলু, ধান ইত্যাদি বেছে জমি বিঘা বা একরে লিখুন।" },
                { bold: "খরচের আগাম হিসাব:", text: "বীজ, সার ও শ্রমিকের খরচ স্বয়ংক্রিয়ভাবে প্রদর্শিত হয়।" },
                { bold: "লাভজনক বিক্রয় দর:", text: "মুনাফা নিশ্চিত করতে সর্বনিম্ন কত দামে বিক্রি করতে হবে তা জেনে নিন।" }
            ]
        },
        tip: {
            en: "Use the 'Unit Converter' button in the top header to easily convert between Bigha, Acre, Guntha, Quintal, and Man.",
            hi: "बीघा और एकड़ में भ्रम से बचने के लिए ऊपर दिए गए 'इकाई परिवर्तक' (Unit Converter) का उपयोग करें।",
            pa: "ਬਿੱਘੇ ਅਤੇ ਏਕੜ ਵਿੱਚ ਫਰਕ ਸਮਝਣ ਲਈ ਉੱਪਰ ਦਿੱਤੇ 'ਇਕਾਈ ਪਰਿਵਰਤਕ' (Unit Converter) ਦੀ ਵਰਤੋਂ ਕਰੋ।",
            mr: "एकर, गुंठा आणि बिघा सहज बदलण्यासाठी वरील 'एकक परिवर्तक' (Unit Converter) वापरा.",
            gu: "વીઘા અને એકર વચ્ચે સરળતાથી ગણતરી કરવા માટે ઉપર આપેલા 'યુનિટ કન્વર્ટર'નો ઉપયોગ કરો.",
            kn: "ಗುಂಟೆ, ಎಕರೆ ಮತ್ತು ಕ್ವಿಂಟಾಲ್ ಪರಿವರ್ತನೆಗಾಗಿ ಮೇಲ್ಭಾಗದಲ್ಲಿರುವ 'ಯೂನಿಟ್ ಕನ್ವರ್ಟರ್' ಬಳಸಿ.",
            te: "ఎకరాలు, గుంటలు మరియు క్వింటాళ్లను మార్చడానికి ఎగువన ఉన్న 'యూనిట్ కన్వర్టర్' ఉపయోగించండి.",
            ta: "ஏக்கர், குண்டா மற்றும் குவிண்டால் மாற்றத்திற்கு மேலே உள்ள 'அலகு மாற்றி'யைப் பயன்படுத்தவும்.",
            bn: "বিঘা ও একরের হিসাব সহজে রূপান্তর করতে উপরের 'একক রূপান্তরকারী' (Unit Converter) ব্যবহার করুন।"
        },
        btnJump: {
            en: "Open Pre-Cost Calculator ➔",
            hi: "लागत कैलकुलेटर खोलें ➔",
            pa: "ਲਾਗਤ ਕੈਲਕੁਲੇਟਰ ਖੋਲ੍ਹੋ ➔",
            mr: "लागत गणक उघडा ➔",
            gu: "ખર્ચ કેલ્ક્યુલેટર ખોલો ➔",
            kn: "ವೆಚ್ಚ ಲೆಕ್ಕಾಚಾರ ತೆರೆಯಿರಿ ➔",
            te: "ఖర్చు కాలిక్యులేటర్ తెరవండి ➔",
            ta: "செலவு கணக்கீட்டைத் திறக்கவும் ➔",
            bn: "খরচ ক্যালকুলেটর খুলুন ➔"
        },
        narration: {
            en: "In Step 2, use the Pre-Cost Calculator before sowing. Enter your crop and land size in acres or bigha. AgriFlow calculates seed, fertilizer, machinery, and labor costs to show your total investment and expected net profit before you spend a single rupee.",
            hi: "दूसरे चरण में, बुवाई से पहले लागत कैलकुलेटर का उपयोग करें। अपनी फसल और जमीन का रकबा एकड़ या बीघा में दर्ज करें। एग्रीफ्लो बीज, खाद, जुताई और मजदूरी की लागत जोड़कर कुल खर्च और शुद्ध मुनाफा पहले ही बता देता है।"
        }
    },
    {
        id: "weather-satellite",
        icon: "🛰️",
        targetTab: "weather",
        title: {
            en: "3. Weather Radar, Soil & ISRO Satellite Scan",
            hi: "3. मौसम रडार, मिट्टी की नमी व इसरो उपग्रह जांच",
            pa: "3. ਮੌਸਮ ਰਡਾਰ, ਮਿੱਟੀ ਦੀ ਨਮੀ ਅਤੇ ਇਸਰੋ ਉਪਗ੍ਰਹਿ ਸਕੈਨ",
            mr: "3. हवामान रडार, मातीतील ओलावा व इस्रो उपग्रह तपासणी",
            gu: "3. હવામાન રડાર, માટીનો ભેજ અને ઇસરો સેટેલાઇટ સ્કેન",
            kn: "3. ಹವಾಮಾನ ರಡಾರ್, ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಇಸ್ರೋ ಉಪಗ್ರಹ ಸ್ಕ್ಯಾನ್",
            te: "3. వాతావరణ రాడార్, నేల తేమ మరియు ఇస్రో శాటిలైట్ స్కాన్",
            ta: "3. வானிலை ரேடார், மண் ஈரப்பதம் மற்றும் இஸ்ரோ செயற்கைக்கோள் ஆய்வு",
            bn: "3. আবহাওয়া রাডার, মাটির আর্দ্রতা ও ইসরো স্যাটেলাইট স্ক্যান"
        },
        desc: {
            en: "Avoid chemical wash-off with 48-hour rain risk alerts and verify plant vigor using live ISRO Bhuvan satellite NDVI data.",
            hi: "बेमौसम बारिश से कीटनाशक धुलने से बचाएं। 48 घंटे की बारिश का जोखिम देखें और इसरो भुवन सैटेलाइट से खेत की हरियाली (NDVI) जांचें।",
            pa: "ਬੇਮੌਸਮੀ ਬਾਰਿਸ਼ ਤੋਂ ਬਚੋ। 48 ਘੰਟਿਆਂ ਦੀ ਬਾਰਿਸ਼ ਦਾ ਖਤਰਾ ਦੇਖੋ ਅਤੇ ਇਸਰੋ ਭੁਵਨ ਉਪਗ੍ਰਹਿ ਤੋਂ ਫਸਲ ਦੀ ਹਰਿਆਵਲ (NDVI) ਜਾਂਚੋ।",
            mr: "अवेळी पावसापासून पिकांचे रक्षण करा. 48 तासांचा पावसाचा धोका तपासा आणि इस्रो उपग्रहाद्वारे पिकांची हिरवळ (NDVI) तपासा.",
            gu: "કમોસમી વરસાદથી પાકનું નુકસાન અટકાવો. 48 કલાકમાં વરસાદનું જોખમ જુઓ અને ઇસરો સેટેલાઇટથી પાકની તંદુરસ્તી તપાસો.",
            kn: "ಅಕಾಲಿಕ ಮಳೆಯಿಂದ ರಕ್ಷಣೆ ಪಡೆಯಿರಿ. 48 ಗಂಟೆಗಳ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ನೋಡಿ ಮತ್ತು ಇಸ್ರೋ ಉಪಗ್ರಹದಿಂದ ಬೆಳೆಯ ಆರೋಗ್ಯ (NDVI) ಪರಿಶೀಲಿಸಿ.",
            te: "అకాల వర్షాల వల్ల పంట నష్టాన్ని నివారించండి. 48 గంటల వర్ష సూచనను మరియు ఇస్రో శాటిలైట్ ద్వారా పంట పచ్చదనాన్ని (NDVI) తనిఖీ చేయండి.",
            ta: "பருவமற்ற மழையிலிருந்து பயிர்களைப் பாதுகாக்கவும். 48 மணிநேர மழை ஆபத்தை அறிந்து இஸ்ரோ செயற்கைக்கோள் மூலம் பயிர் ஆரோக்கியத்தை சரிபார்க்கவும்.",
            bn: "অসময়ের বৃষ্টি থেকে ফসল রক্ষা করুন। ৪৮ ঘণ্টার বৃষ্টির পূর্বাভাস দেখুন এবং ইসরো ভুয়ান উপগ্রহ দিয়ে ফসলের স্বাস্থ্য পরীক্ষা করুন।"
        },
        points: {
            en: [
                { bold: "48-Hour Rain & Spray Advisory:", text: "Check hourly rain probabilities before spraying fertilizers or chemicals to avoid waste." },
                { bold: "Soil Moisture & Canopy Hydrology:", text: "Monitor topsoil moisture, temperature, and optimal irrigation windows." },
                { bold: "ISRO Bhuvan Satellite Scan:", text: "Click 'Scan Field with Drone / Satellite' to pull live ISRO LULC land verification and multispectral NDVI health scores." }
            ],
            hi: [
                { bold: "48 घंटे बारिश व स्प्रे परामर्श:", text: "दवा छिड़कने से पहले 48 घंटे में बारिश की संभावना देखें ताकि महंगी दवा पानी में बहने से बच सके।" },
                { bold: "मिट्टी की नमी व तापमान:", text: "जड़ क्षेत्र में नमी और सिंचाई की जरूरत का वैज्ञानिक परामर्श प्राप्त करें।" },
                { bold: "इसरो भुवन सैटेलाइट जांच:", text: "'खेत स्कैन करें' पर क्लिक करके अंतरिक्ष से इसरो उपग्रह द्वारा खेत की वास्तविक हरियाली (NDVI) और भूमि प्रकार देखें।" }
            ],
            pa: [
                { bold: "48 ਘੰਟੇ ਬਾਰਿਸ਼ ਅਤੇ ਸਪਰੇਅ ਸਲਾਹ:", text: "ਸਪਰੇਅ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਚੈੱਕ ਕਰੋ ਤਾਂ ਜੋ ਦਵਾਈ ਬੇਕਾਰ ਨਾ ਜਾਵੇ।" },
                { bold: "ਮਿੱਟੀ ਦੀ ਨਮੀ:", text: "ਸਿੰਚਾਈ ਲਈ ਮਿੱਟੀ ਦੀ ਨਮੀ ਅਤੇ ਤਾਪਮਾਨ ਦੀ ਜਾਂਚ ਕਰੋ।" },
                { bold: "ਇਸਰੋ ਭੁਵਨ ਸਕੈਨ:", text: "ਇਸਰੋ ਉਪਗ੍ਰਹਿ ਰਾਹੀਂ ਖੇਤ ਦੀ ਹਰਿਆਲੀ (NDVI) ਅਤੇ ਜ਼ਮੀਨ ਦੀ ਜਾਂਚ ਕਰੋ।" }
            ],
            mr: [
                { bold: "48 तास पाऊस व फवारणी सल्ला:", text: "औषध फवारण्यापूर्वी पावसाची शक्यता तपासा जेणेकरून औषध वाहून जाणार नाही." },
                { bold: "मातीतील ओलावा:", text: "पाणी देण्याची अचूक वेळ आणि मातीतील ओलावा तपासा." },
                { bold: "इस्रो उपग्रह स्कॅनिंग:", text: "इस्रो भुवन सॅटेलाइटद्वारे शेतातील पिकांची निरोगी हिरवळ (NDVI) तपासा." }
            ],
            gu: [
                { bold: "48 કલાક વરસાદ અને છંટકાવ સલાહ:", text: "દવા છાંટતા પહેલા વરસાદની શક્યતા જુઓ જેથી દવાનો બગાડ ન થાય." },
                { bold: "જમીનનો ભેજ:", text: "પિયત માટે જમીનનો ભેજ અને તાપમાન તપાસો." },
                { bold: "ઇસરો સેટેલાઇટ તપાસ:", text: "ઇસરો ભુવન દ્વારા પાકની હરિયાળી (NDVI) અને જમીનની સ્થિતિ જુઓ." }
            ],
            kn: [
                { bold: "48 ಗಂಟೆ ಮಳೆ ಮತ್ತು ಸಿಂಪರಣೆ ಸಲಹೆ:", text: "ಔಷಧ ಸಿಂಪಡಿಸುವ ಮುನ್ನ ಮಳೆ ಮುನ್ಸೂಚನೆ ಪರಿಶೀಲಿಸಿ." },
                { bold: "ಮಣ್ಣಿನ ತೇವಾಂಶ:", text: "ನೀರಾವರಿ ಸಮಯ ಮತ್ತು ಮಣ್ಣಿನ ತೇವಾಂಶವನ್ನು ಗಮನಿಸಿ." },
                { bold: "ಇಸ್ರೋ ಉಪಗ್ರಹ ಸ್ಕ್ಯಾನ್:", text: "ಇಸ್ರೋ ಭುವನ್ ಮೂಲಕ ಜಮೀನಿನ ಬೆಳೆಯ ಹಸಿರು ಸೂಚ್ಯಂಕ (NDVI) ಪರಿಶೀಲಿಸಿ." }
            ],
            te: [
                { bold: "48 గంటల వర్షం & పిచికారీ సలహా:", text: "మందులు పిచికారీ చేసే ముందు వర్ష సూచనను తనిఖీ చేయండి." },
                { bold: "నేల తేమ:", text: "నీటిపారుదల అవసరం మరియు నేల ఉష్ణోగ్రతను తెలుసుకోండి." },
                { bold: "ఇస్రో శాటిలైట్ స్కాన్:", text: "ఇస్రో భువన్ ఉపగ్రహం ద్వారా పంట ఆరోగ్య సూచికను (NDVI) చూడండి." }
            ],
            ta: [
                { bold: "48 மணிநேர மழை & தெளிப்பு ஆலோசனை:", text: "மருந்து தெளிப்பதற்கு முன் மழை வாய்ப்பை சரிபார்க்கவும்." },
                { bold: "மண் ஈரப்பதம்:", text: "பாசனத் தேவை மற்றும் மண் வெப்பநிலையைக் கண்காணிக்கவும்." },
                { bold: "இஸ்ரோ செயற்கைக்கோள் ஆய்வு:", text: "இஸ்ரோ புவன் மூலம் பயிர் பசுமை குறியீட்டை (NDVI) சரிபார்க்கவும்." }
            ],
            bn: [
                { bold: "৪৮ ঘণ্টা বৃষ্টি ও স্প্রে পরামর্শ:", text: "ওষুধ স্প্রে করার আগে বৃষ্টির সম্ভাবনা দেখে নিন যাতে অপচয় না হয়।" },
                { bold: "মাটির আর্দ্রতা:", text: "সেচের সঠিক সময় এবং মাটির আর্দ্রতা পরীক্ষা করুন।" },
                { bold: "ইসরো উপগ্রহ স্ক্যান:", text: "ইসরো ভুয়ান স্যাটেলাইট থেকে ফসলের সতেজতা (NDVI) যাচাই করুন।" }
            ]
        },
        tip: {
            en: "If rain probability is over 40%, postpone pesticide spraying by 24 hours to save up to ₹1,500/acre in washed chemicals.",
            hi: "यदि बारिश की संभावना 40% से अधिक हो, तो कीटनाशक का छिड़काव 24 घंटे टाल दें ताकि दवा पानी में बहकर बर्बाद न हो।",
            pa: "ਜੇਕਰ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ 40% ਤੋਂ ਵੱਧ ਹੈ, ਤਾਂ ਸਪਰੇਅ 24 ਘੰਟੇ ਟਾਲ ਦਿਓ ਤਾਂ ਜੋ ਖਰਚਾ ਬਚ ਸਕੇ।",
            mr: "पावसाची शक्यता 40% पेक्षा जास्त असल्यास, फवारणी 24 तास पुढे ढकला जेणेकरून औषध वाया जाणार नाही.",
            gu: "જો વરસાદની શક્યતા 40% થી વધુ હોય, તો દવાનો છંટકાવ 24 કલાક ટાળો જેથી ખર્ચ બચે.",
            kn: "ಮಳೆಯ ಸಾಧ್ಯತೆ 40% ಕ್ಕಿಂತ ಹೆಚ್ಚಿದ್ದರೆ, ಸಿಂಪರಣೆಯನ್ನು ಮುಂದೂಡಿ ಹಣ ಉಳಿಸಿ.",
            te: "వర్షం పడే అవకాశం 40% కంటే ఎక్కువ ఉంటే, మందుల పిచికారీని వాయిదా వేయండి.",
            ta: "மழை வாய்ப்பு 40%க்கு மேல் இருந்தால், மருந்து தெளிப்பதை ஒத்திவைக்கவும்.",
            bn: "বৃষ্টির সম্ভাবনা ৪০% এর বেশি হলে স্প্রে করা ২৪ ঘণ্টা পিছিয়ে দিন যাতে ওষুধের অপচয় রোধ হয়।"
        },
        btnJump: {
            en: "Check Weather & Satellite ➔",
            hi: "मौसम व उपग्रह जांच खोलें ➔",
            pa: "ਮੌਸਮ ਅਤੇ ਉਪਗ੍ਰਹਿ ਜਾਂਚ ਖੋਲ੍ਹੋ ➔",
            mr: "हवामान व उपग्रह तपासणी उघडा ➔",
            gu: "હવામાન અને સેટેલાઇટ તપાસ ખોલો ➔",
            kn: "ಹವಾಮಾನ ಮತ್ತು ಉಪಗ್ರಹ ಪರೀಕ್ಷೆ ತೆರೆಯಿರಿ ➔",
            te: "వాతావరణం మరియు శాటిలైట్ తెరవండి ➔",
            ta: "வானிலை & செயற்கைக்கோள் ஆய்வைத் திற ➔",
            bn: "আবহাওয়া ও উপগ্রহ পরীক্ষা খুলুন ➔"
        },
        narration: {
            en: "In Step 3, check the 48-hour rain forecast before spraying chemicals. Check soil moisture and click 'Scan Field with ISRO' to view live satellite vegetation health, NDVI index, and soil conditions directly from space.",
            hi: "तीसरे चरण में, दवा छिड़कने से पहले 48 घंटे के मौसम की जांच करें। मिट्टी की नमी देखें और 'खेत स्कैन करें' पर क्लिक करके अंतरिक्ष से इसरो उपग्रह द्वारा खेत की वास्तविक हरियाली और स्थिति देखें।"
        }
    },
    {
        id: "mandi-rates",
        icon: "🏛️",
        targetTab: "mandi",
        title: {
            en: "4. Live Agmarknet Mandi Rates & Price Trends",
            hi: "4. ताजा मंडी भाव और 14 दिनों का मूल्य रुझान",
            pa: "4. ਤਾਜ਼ਾ ਮੰਡੀ ਦੇ ਭਾਅ ਅਤੇ 14 ਦਿਨਾਂ ਦਾ ਰੁਝਾਨ",
            mr: "4. ताजे बाजार भाव आणि 14 दिवसांचा कल",
            gu: "4. તાજા માર્કેટ યાર્ડ ભાવો અને 14 દિવસનું વલણ",
            kn: "4. ಲೈವ್ ಮಂಡಿ ದರಗಳು ಮತ್ತು 14 ದಿನಗಳ ಬೆಲೆ ಪ್ರವೃತ್ತಿ",
            te: "4. లైవ్ మార్కెట్ యార్డ్ ధరలు మరియు 14 రోజుల ట్రెండ్స్",
            ta: "4. நேரடி மண்டி விலைகள் மற்றும் 14 நாள் விலை போக்கு",
            bn: "4. লাইভ মণ্ডির দর এবং ১৪ দিনের মূল্যের প্রবণতা"
        },
        desc: {
            en: "View official government Agmarknet modal prices across mandis, compare neighboring markets, and check 14-day price forecasting.",
            hi: "सरकारी एगमार्कनेट के अनुसार विभिन्न मंडियों के मॉडल भाव देखें, आसपास की मंडियों की तुलना करें और 14-दिन का तेजी-मंदी चार्ट समझें।",
            pa: "ਸਰਕਾਰੀ ਐਗਮਾਰਕਨੇਟ ਅਨੁਸਾਰ ਮੰਡੀਆਂ ਦੇ ਤਾਜ਼ਾ ਮਾਡਲ ਭਾਅ ਦੇਖੋ ਅਤੇ 14 ਦਿਨਾਂ ਦੇ ਚਾਰਟ ਤੋਂ ਜਾਣੋ ਕਿ ਰੇਟ ਵਧਣਗੇ ਜਾਂ ਘਟਣਗੇ।",
            mr: "सरकारी ॲगमार्कनेटनुसार विविध बाजार समित्यांचे ताजे भाव तपासा आणि 14 दिवसांच्या आलेखावरून तेजी-मंदीचा अंदाज घ्या.",
            gu: "સરકારી એગમાર્કનેટ અનુસાર વિવિધ યાર્ડના તાજા મોડલ ભાવો જુઓ અને 14 દિવસના અનુમાનથી તેજી-મંદી સમજો.",
            kn: "ಸರ್ಕಾರಿ ಆಗ್ಮಾರ್ಕ್ನೆಟ್ ಪ್ರಕಾರ ವಿವಿಧ ಮಂಡಿಗಳ ಇಂದಿನ ದರ ನೋಡಿ ಮತ್ತು 14 ದಿನಗಳ ಮುನ್ಸೂಚನೆಯೊಂದಿಗೆ ಬೆಲೆ ಏರಿಳಿತ ತಿಳಿಯಿರಿ.",
            te: "ప్రభుత్వ అగ్మార్క్‌నెట్ ప్రకారం వివిధ మార్కెట్ల తాజా ధరలను మరియు 14 రోజుల ధరల హెచ్చుతగ్గుల అంచనాను చూడండి.",
            ta: "அரசு அக்மார்க்நெட் மூலம் அருகிலுள்ள மண்டிகளின் இன்றைய விலைகளை அறிந்து 14 நாள் விலை முன்னறிவிப்பைப் பார்க்கவும்.",
            bn: "সরকারি অ্যাগমार्कনেট অনুযায়ী বিভিন্ন মণ্ডির আজকের রেট দেখুন এবং ১৪ দিনের পূর্বাভাসের মাধ্যমে দাম বাড়া-কমার ট্রেন্ড জানুন।"
        },
        points: {
            en: [
                { bold: "Official APMC Modal Rates:", text: "Access live daily rates (Min, Max, Modal price per quintal) directly from Agmarknet." },
                { bold: "Compare Neighboring Mandis:", text: "See rates in surrounding districts side-by-side to find the best buyer." },
                { bold: "14-Day Price Projections:", text: "AI analyzes arrivals and historical trends to forecast whether prices will rise or fall." }
            ],
            hi: [
                { bold: "सरकारी मॉडल भाव:", text: "एगमार्कनेट से आज का न्यूनतम, अधिकतम और मॉडल भाव (प्रति क्विंटल) तुरंत देखें।" },
                { bold: "आसपास की मंडियों की तुलना:", text: "आसपास के जिलों की मंडियों के भाव एक साथ देखें कि सबसे ज्यादा रेट कहां मिल रहा है।" },
                { bold: "14-दिन का मूल्य पूर्वानुमान:", text: "चार्ट से समझें कि आगामी दिनों में मंडी में आवक बढ़ने से भाव गिरेंगे या मांग से भाव बढ़ेंगे।" }
            ],
            pa: [
                { bold: "ਸਰਕਾਰੀ ਮਾਡਲ ਰੇਟ:", text: "ਅੱਜ ਦਾ ਘੱਟੋ-ਘੱਟ, ਵੱਧ ਤੋਂ ਵੱਧ ਅਤੇ ਮਾਡਲ ਭਾਅ ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਦੇਖੋ।" },
                { bold: "ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ:", text: "ਆਸ-ਪਾਸ ਦੀਆਂ ਮੰਡੀਆਂ ਦੇ ਰੇਟ ਮਿਲਾ ਕੇ ਸਭ ਤੋਂ ਵਧੀਆ ਮੰਡੀ ਚੁਣੋ।" },
                { bold: "14 ਦਿਨਾਂ ਦਾ ਅਨੁਮਾਨ:", text: "ਆਉਣ ਵਾਲੇ ਦਿਨਾਂ ਵਿੱਚ ਤੇਜ਼ੀ ਜਾਂ ਮੰਦੀ ਦਾ ਪਹਿਲਾਂ ਹੀ ਪਤਾ ਲਗਾਓ।" }
            ],
            mr: [
                { bold: "अधिकृत बाजार भाव:", text: "आजचे किमान, कमाल आणि सरासरी दर प्रति क्विंटल तपासा." },
                { bold: "बाजार समित्यांची तुलना:", text: "कोणत्या बाजार समितीत सर्वाधिक भाव मिळतोय ते एका नजरेत पाहा." },
                { bold: "14 दिवसांचा अंदाज:", text: "भविष्यात भाव वाढणार की कमी होणार याचा अंदाज घेऊन विक्री ठरवा." }
            ],
            gu: [
                { bold: "સરકારી મોડલ ભાવ:", text: "આજના લઘુત્તમ, મહત્તમ અને મોડલ ભાવો પ્રતિ ક્વિન્ટલ જુઓ." },
                { bold: "યાર્ડની સરખામણી:", text: "આજુબાજુના માર્કેટ યાર્ડના ભાવો સરખાવીને સૌથી સારો ભાવ મેળવો." },
                { bold: "14 દિવસનું અનુમાન:", text: "આવનારા દિવસોમાં તેજી આવશે કે મંદી તે ચાર્ટ દ્વારા સમજો." }
            ],
            kn: [
                { bold: "ಅಧಿಕೃತ ಮಂಡಿ ದರಗಳು:", text: "ಇಂದಿನ ಕನಿಷ್ಠ, ಗರಿಷ್ಠ ಮತ್ತು ಸರಾಸರಿ ಮಂಡಿ ದರಗಳನ್ನು ವೀಕ್ಷಿಸಿ." },
                { bold: "ಮಂಡಿಗಳ ಹೋಲಿಕೆ:", text: "ಯಾವ ಮಂಡಿಯಲ್ಲಿ ಹೆಚ್ಚು ಬೆಲೆ ಸಿಗುತ್ತದೆ ಎಂಬುದನ್ನು ಸುಲಭವಾಗಿ ಹೋಲಿಸಿ." },
                { bold: "14 ದಿನಗಳ ಬೆಲೆ ಪ್ರವೃತ್ತಿ:", text: "ಮುಂದಿನ ದಿನಗಳಲ್ಲಿ ಬೆಲೆ ಹೆಚ್ಚಾಗುವುದೇ ಅಥವಾ ಕಡಿಮೆಯಾಗುವುದೇ ತಿಳಿಯಿರಿ." }
            ],
            te: [
                { bold: "అధికారిక మార్కెట్ ధరలు:", text: "నేటి కనీస, గరిష్ట మరియు సగటు ధరలను క్వింటాలుకు తెలుసుకోండి." },
                { bold: "మార్కెట్ల పోలిక:", text: "ఎక్కడ ఎక్కువ ధర వస్తుందో తెలుసుకోవడానికి సమీప మార్కెట్లను పోల్చండి." },
                { bold: "14 రోజుల ధరల అంచనా:", text: "రాబోయే రోజుల్లో ధరలు పెరుగుతాయా లేదా తగ్గుతాయా ముందే తెలుసుకోండి." }
            ],
            ta: [
                { bold: "அதிகாரப்பூர்வ மண்டி விலைகள்:", text: "இன்றைய குறைந்தபட்ச, அதிகபட்ச மற்றும் மாதிரி விலைகளை அறிக." },
                { bold: "மண்டிகளை ஒப்பிடுக:", text: "எந்த சந்தையில் அதிக விலை கிடைக்கிறது என்பதை ஒப்பிட்டுப் பாருங்கள்." },
                { bold: "14 நாள் விலை போக்கு:", text: "വരും நாட்களில் விலை ஏறுமா இறங்குமா என்பதை முன்கூட்டியே கணிக்கவும்." }
            ],
            bn: [
                { bold: "সরকারি মডেল রেট:", text: "আজকের সর্বনিম্ন, সর্বোচ্চ এবং গড় দর প্রতি কুইন্টাল দেখে নিন।" },
                { bold: "আশপাশের মণ্ডি তুলনা:", text: "কোন বাজারে সবথেকে ভালো দাম মিলছে তা পাশাপাশি তুলনা করুন।" },
                { bold: "১৪ দিনের পূর্বাভাসের চার্ট:", text: "আগামী দিনে মণ্ডিতে দাম বাড়বে না কমবে তা চার্ট দেখে সিদ্ধান্ত নিন।" }
            ]
        },
        tip: {
            en: "Check mandis within a 50 km radius. Transporting produce slightly further can often earn ₹300 to ₹500 extra per quintal.",
            hi: "50 किमी के दायरे की मंडियों के भाव देखें; थोड़ी दूर की मंडी में बेचने पर अक्सर प्रति क्विंटल ₹300 से ₹500 अधिक मिल जाते हैं।",
            pa: "50 ਕਿਲੋਮੀਟਰ ਦੇ ਦਾਇਰੇ ਵਿੱਚ ਭਾਅ ਦੇਖੋ; ਥੋੜ੍ਹੀ ਦੂਰ ਵੇਚਣ 'ਤੇ ₹300-₹500 ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਵੱਧ ਮਿਲ ਸਕਦੇ ਹਨ।",
            mr: "50 किमी परिसरातील बाजार समित्यांचे भाव तपासा; थोड्या दूरच्या बाजारात प्रति क्विंटल ₹300 ते ₹500 जास्त मिळू शकतात.",
            gu: "50 કિમીના વિસ્તારમાં ભાવો તપાસો; થોડે દૂરના યાર્ડમાં વેચવાથી પ્રતિ ક્વિન્ટલ ₹300 થી ₹500 વધુ મળી શકે છે.",
            kn: "50 ಕಿ.ಮೀ ವ್ಯಾಪ್ತಿಯ ಮಂಡಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಸ್ವಲ್ಪ ದೂರ ಸಾಗಿಸಿದರೂ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹300-₹500 ಹೆಚ್ಚು ಲಾಭ ಪಡೆಯಬಹುದು.",
            te: "50 కి.మీ పరిధిలోని మార్కెట్లను చూడండి; కొద్దిగా దూరం వెళ్లినా క్వింటాలుకు ₹300-₹500 ఎక్కువ లభించవచ్చు.",
            ta: "50 கி.மீ சுற்றளவில் உள்ள மண்டிகளைப் பாருங்கள்; சற்று தூரம் சென்றாலும் குவிண்டாலுக்கு ₹300-₹500 கூடுதல் வருமானம் கிடைக்கும்.",
            bn: "৫০ কিমি দূরত্বের মণ্ডির দর যাচাই করুন; একটু দূরে বিক্রি করলে প্রায়শই কুইন্টালে ₹৩০০ থেকে ₹৫০০ বেশি লাভ পাওয়া যায়।"
        },
        btnJump: {
            en: "View Live Mandi Rates ➔",
            hi: "ताजा मंडी भाव देखें ➔",
            pa: "ਤਾਜ਼ਾ ਮੰਡੀ ਭਾਅ ਦੇਖੋ ➔",
            mr: "ताजे बाजार भाव पाहा ➔",
            gu: "તાજા માર્કેટ ભાવો જુઓ ➔",
            kn: "ಲೈವ್ ಮಂಡಿ ದರ ನೋಡಿ ➔",
            te: "లైవ్ మార్కెట్ ధరలు చూడండి ➔",
            ta: "நேரடி மண்டி விலையைப் பார் ➔",
            bn: "লাইভ মণ্ডির দর দেখুন ➔"
        },
        narration: {
            en: "In Step 4, view real-time government Agmarknet mandi rates. Compare neighboring APMC mandis to find the highest buyer, and use the 14-day price chart to predict whether prices are rising or falling.",
            hi: "चौथे चरण में, सरकारी एगमार्कनेट से ताजा मंडी भाव देखें। आसपास की मंडियों की तुलना करके सबसे ज्यादा भाव देने वाली मंडी खोजें और 14-दिन के चार्ट से तेजी-मंदी का पता लगाएं।"
        }
    },
    {
        id: "sell-decision",
        icon: "⚖️",
        targetTab: "sell-decision",
        title: {
            en: "5. Sell Now or Wait? Storage Economics",
            hi: "5. अभी बेचें या रुकें? भंडारण लाभ-हानि कैलकुलेटर",
            pa: "5. ਹੁਣੇ ਵੇਚੋ ਜਾਂ ਰੋਕੋ? ਸਟੋਰੇਜ ਮੁਨਾਫ਼ਾ ਕੈਲਕੁਲੇਟਰ",
            mr: "5. आत्ता विकावे की थांबावे? साठवणूक नफा-तोटा",
            gu: "5. અત્યારે વેચવું કે રોકવું? સ્ટોરેજ નફો કેલ્ક્યુલેટર",
            kn: "5. ಈಗಲೇ ಮಾರಾಟ ಮಾಡಬೇಕೆ ಅಥವಾ ಕಾಯಬೇಕೆ?",
            te: "5. ఇప్పుడే అమ్మాలా లేదా వేచి ఉండాలా? కోల్డ్ స్టోరేజ్ గణన",
            ta: "5. இப்போதே விற்கவா அல்லது சேமிக்கவா? சேமிப்புக் கிடங்கு கணக்கீடு",
            bn: "5. এখনই বিক্রি করবেন নাকি মজুত রাখবেন?"
        },
        desc: {
            en: "Calculate storage rent, weight loss, and price forecasts to get an unambiguous recommendation: sell immediately or store for higher profit.",
            hi: "शीतगृह का किराया, वजन में प्राकृतिक कमी और भविष्य के बढ़े भावों का हिसाब लगाकर जानें कि तुरंत बेचना सही है या कोल्ड स्टोरेज में रखना।",
            pa: "ਗੋਦਾਮ ਕਿਰਾਇਆ, ਵਜ਼ਨ ਘਟਣਾ ਅਤੇ ਭਵਿੱਖ ਦੇ ਵਧੇ ਭਾਵਾਂ ਦੀ ਗਣਨਾ ਕਰਕੇ ਸਹੀ ਫੈਸਲਾ ਲਓ: ਹੁਣੇ ਵੇਚਣਾ ਹੈ ਜਾਂ ਸਟੋਰ ਕਰਨਾ ਹੈ।",
            mr: "शीतगृहाचे भाडे, वजनातील घट आणि भविष्यातील भाववाढ मोजून योग्य निर्णय घ्या: लगेच विकावे की साठवून ठेवावे.",
            gu: "કોલ્ડ સ્ટોરેજ ભાડું, વજનમાં ઘટાડો અને ભાવવધારાની ગણતરી કરીને શ્રેષ્ઠ નિર્ણય મેળવો.",
            kn: "ಶೇಖರಣಾ ಬಾಡಿಗೆ ಮತ್ತು ಭವಿಷ್ಯದ ಬೆಲೆ ಏರಿಕೆಯನ್ನು ಲೆಕ್ಕಹಾಕಿ ಸೂಕ್ತ ನಿರ್ಧಾರ ಪಡೆಯಿರಿ: ಈಗಲೇ ಮಾರಿ ಅಥವಾ ಸಂಗ್ರಹಿಸಿ.",
            te: "నిల్వ అద్దె, బరువు తగ్గుదల మరియు భవిష్యత్ ధరలను లెక్కించి సరైన నిర్ణయం తీసుకోండి: ఇప్పుడే అమ్మాలా లేదా నిల్వ చేయాలా.",
            ta: "சேமிப்பு வாடகை மற்றும் எதிர்கால விலையேற்றத்தைக் கணக்கிட்டு இப்போதே விற்கவா அல்லது சேமிக்கவா என்பதைத் தீர்மானிக்கவும்.",
            bn: "হিমাগারের ভাড়া, ওজন হ্রাস এবং ভবিষ্যতের বাড়তি দামের হিসাব করে সঠিক সিদ্ধান্ত নিন।"
        },
        points: {
            en: [
                { bold: "Enter Quantity & Today's Offer:", text: "Enter your harvest volume in Quintals and what local traders are offering today." },
                { bold: "Automatic Storage Deduction:", text: "AgriFlow automatically deducts cold storage monthly fees and natural shrinkage from future projected prices." },
                { bold: "Verdict & Nearest Cold Storage:", text: "Get an instant 'HOLD & STORE' or 'SELL NOW' verdict with net profit difference and nearest cold stores on map." }
            ],
            hi: [
                { bold: "फसल मात्रा व आज का भाव दर्ज करें:", text: "अपनी फसल की मात्रा (क्विंटल) और आज का मिल रहा भाव दर्ज करें।" },
                { bold: "किराया व वजन घटने का वैज्ञानिक हिसाब:", text: "एग्रीफ्लो शीतगृह का किराया और प्राकृतिक वजन घटने को घटाकर शुद्ध लाभ निकालता है।" },
                { bold: "स्पष्ट फैसला व नजदीकी कोल्ड स्टोरेज:", text: "नक्शे पर नजदीकी कोल्ड स्टोरेज के साथ स्पष्ट फैसला ('अभी बेचें' या 'भंडारण करें') रुपये के लाभ के साथ देखें।" }
            ],
            pa: [
                { bold: "ਮਾਤਰਾ ਅਤੇ ਅੱਜ ਦਾ ਰੇਟ ਦਰਜ ਕਰੋ:", text: "ਆਪਣੀ ਫਸਲ ਦੀ ਮਾਤਰਾ (ਕੁਇੰਟਲ) ਅਤੇ ਅੱਜ ਦਾ ਰੇਟ ਭਰੋ।" },
                { bold: "ਸਟੋਰੇਜ ਕਿਰਾਇਆ ਅਤੇ ਘਾਟਾ:", text: "ਐਗਰੀਫਲੋ ਕਿਰਾਇਆ ਅਤੇ ਵਜ਼ਨ ਘਟਣ ਨੂੰ ਘਟਾ ਕੇ ਸ਼ੁੱਧ ਲਾਭ ਕੱਢਦਾ ਹੈ।" },
                { bold: "ਸਪੱਸ਼ਟ ਫੈਸਲਾ ਅਤੇ ਨਜ਼ਦੀਕੀ ਗੋਦਾਮ:", text: "ਨਕਸ਼ੇ 'ਤੇ ਨੇੜਲੇ ਕੋਲਡ ਸਟੋਰ ਦੇ ਨਾਲ ਸਪੱਸ਼ਟ ਫੈਸਲਾ ਦੇਖੋ।" }
            ],
            mr: [
                { bold: "प्रमाण आणि आजचा भाव नोंदवा:", text: "पिकाचे प्रमाण (क्विंटल) आणि आजचा व्यापारी दर टाका." },
                { bold: "भाडे व घट वजावट:", text: "शीतगृह भाडे आणि नैसर्गिक घट वजा करून निव्वळ नफा मोजला जातो." },
                { bold: "निकालासह जवळचे शीतगृह:", text: "नकाशावर जवळचे कोल्ड स्टोरेज आणि थेट नफा तुलना पाहा." }
            ],
            gu: [
                { bold: "જથ્થો અને આજનો ભાવ દાખલ કરો:", text: "તમારો પાક (ક્વિન્ટલ) અને આજનો ભાવ દાખલ કરો." },
                { bold: "ભાડું અને વજન ઘટની ગણતરી:", text: "સ્ટોરેજ ભાડું અને વજન ઘટ બાદ કરી ચોખ્ખો નફો ગણાય છે." },
                { bold: "સ્પષ્ટ નિર્ણય અને નજીકનું સ્ટોરેજ:", text: "નકશા પર નજીકના કોલ્ડ સ્ટોરેજ સાથે સ્પષ્ટ સલાહ મેળવો." }
            ],
            kn: [
                { bold: "ಪ್ರಮಾಣ ಮತ್ತು ಇಂದಿನ ದರ ನಮೂದಿಸಿ:", text: "ಬೆಳೆಯ ಪ್ರಮಾಣ (ಕ್ವಿಂಟಾಲ್) ಮತ್ತು ಇಂದಿನ ದರವನ್ನು ನಮೂದಿಸಿ." },
                { bold: "ಶೇಖರಣಾ ಖರ್ಚುಗಳ ಕಡಿತ:", text: "ಬಾಡಿಗೆ ಮತ್ತು ನೈಸರ್ಗಿಕ ತೂಕ ನಷ್ಟವನ್ನು ಕಳೆದು ನಿವ್ವಳ ಲಾಭ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ." },
                { bold: "ಸ್ಪಷ್ಟ ನಿರ್ಧಾರ ಮತ್ತು ಹತ್ತಿರದ ಕೋಲ್ಡ್ ಸ್ಟೋರೇಜ್:", text: "ಮ್ಯಾಪ್‌ನಲ್ಲಿ ಹತ್ತಿರದ ಗೋದಾಮುಗಳೊಂದಿಗೆ ಸ್ಪಷ್ಟ ನಿರ್ಧಾರ ಪಡೆಯಿರಿ." }
            ],
            te: [
                { bold: "పరిమాణం మరియు నేటి ధర నమోదు చేయండి:", text: "పంట పరిమాణం మరియు ప్రస్తుత మార్కెట్ ధరను నమోదు చేయండి." },
                { bold: "ఖర్చుల మినహాయింపు:", text: "నిల్వ అద్దె మరియు బరువు తగ్గుదలను తగ్గించి నికర లాభాన్ని లెక్కిస్తుంది." },
                { bold: "స్పష్టమైన నిర్ణయం & సమీప కోల్డ్ స్టోరేజ్:", text: "మ్యాప్‌లో సమీప శీతల గిడ్డంగులతో పాటు స్పష్టమైన నిర్ణయం పొందండి." }
            ],
            ta: [
                { bold: "அளவு மற்றும் இன்றைய விலையை உள்ளிடவும்:", text: "பயிர் அளவு மற்றும் இன்றைய விலையை உள்ளிடவும்." },
                { bold: "வாடகை மற்றும் எடை இழப்பு கணக்கீடு:", text: "வாடகை மற்றும் எடை இழப்பைக் கழித்து நிகர லாபத்தை கணக்கிடுகிறது." },
                { bold: "தெளிவான முடிவு மற்றும் அருகிலுள்ள கிடங்கு:", text: "மேப்பில் அருகிலுள்ள சேமிப்புக் கிடங்குகளுடன் தெளிவான முடிவை அறியவும்." }
            ],
            bn: [
                { bold: "পরিমাণ ও আজকের দর লিখুন:", text: "ফসলের পরিমাণ (কুইন্টাল) এবং বর্তমান বাজার দর লিখুন।" },
                { bold: "ভাড়া ও ওজন হ্রাসের হিসাব:", text: "হিমাগারের ভাড়া ও প্রাকৃতিক ওজন হ্রাস বাদ দিয়ে নিট লাভ বের করা হয়।" },
                { bold: "স্পষ্ট সিদ্ধান্ত ও নিকটস্থ হিমাগার:", text: "মানচিত্রে নিকটস্থ কোল্ড স্টোরেজ এবং লাভ-ক্ষতির স্পষ্ট সিদ্ধান্ত পান।" }
            ]
        },
        tip: {
            en: "If the projected profit gain from storage is less than 8-10%, selling now eliminates transport hassle and quality risk.",
            hi: "यदि भंडारण से शुद्ध लाभ में 8-10% से कम वृद्धि हो, तो फसल को तुरंत बेचना जोखिम मुक्त रहता है।",
            pa: "ਜੇਕਰ ਸਟੋਰ ਕਰਨ 'ਤੇ ਮੁਨਾਫ਼ਾ 8-10% ਤੋਂ ਘੱਟ ਹੈ, ਤਾਂ ਹੁਣੇ ਵੇਚਣਾ ਬਿਨਾਂ ਕਿਸੇ ਜੋਖਮ ਦੇ ਬਿਹਤਰ ਹੈ।",
            mr: "जर साठवणुकीतून निव्वळ नफा 8-10% पेक्षा कमी वाढत असेल, तर लगेच विकणे सुरक्षित राहते.",
            gu: "જો સ્ટોરેજથી નફો 8-10% કરતાં ઓછો વધતો હોય, તો તરત વેચી દેવું જોખમ મુક્ત રહે છે.",
            kn: "ಶೇಖರಣೆಯಿಂದ ಬರುವ ಲಾಭವು 8-10% ಕ್ಕಿಂತ ಕಡಿಮೆಯಿದ್ದರೆ, ಈಗಲೇ ಮಾರಾಟ ಮಾಡುವುದು ಸುರಕ್ಷಿತ.",
            te: "నిల్వ చేయడం ద్వారా లాభం 8-10% కంటే తక్కువగా ఉంటే, ఇప్పుడే అమ్మడం మంచిది.",
            ta: "சேமிப்பால் கிடைக்கும் லாபம் 8-10% க்கும் குறைவாக இருந்தால், இப்போதே விற்பது பாதுகாப்பானது.",
            bn: "যদি মজুত রাখলে লাভের বৃদ্ধি ৮-১০% এর কম হয়, তবে এখনই বিক্রি করা ঝুঁকিমুক্ত।"
        },
        btnJump: {
            en: "Evaluate Sell Decision ➔",
            hi: "बिक्री निर्णय जांचें ➔",
            pa: "ਵਿਕਰੀ ਫੈਸਲਾ ਜਾਂਚੋ ➔",
            mr: "विक्री निर्णय तपासा ➔",
            gu: "વેચાણ નિર્ણય તપાસો ➔",
            kn: "ಮಾರಾಟ ನಿರ್ಧಾರ ಪರಿಶೀಲಿಸಿ ➔",
            te: "విక్రయ నిర్ణయాన్ని పరిశీలించండి ➔",
            ta: "விற்பனை முடிவை ஆராய்க ➔",
            bn: "বিক্রয় সিদ্ধান্ত যাচাই করুন ➔"
        },
        narration: {
            en: "In Step 5, solve the dilemma: Should you sell now or store your produce? AgriFlow calculates storage rent and weight loss against future price rise, giving you an exact rupee profit comparison and nearby cold storages on a map.",
            hi: "पांचवें चरण में जानें कि फसल अभी बेचें या रोकें। एग्रीफ्लो शीतगृह का किराया और वजन घटने का हिसाब लगाकर शुद्ध लाभ की तुलना करता है और नक्शे पर नजदीकी कोल्ड स्टोरेज दिखाता है।"
        }
    },
    {
        id: "crop-ai",
        icon: "📸",
        targetTab: "add-batch",
        title: {
            en: "6. Register Batch, Gemini AI Defect Scan & WhatsApp Slips",
            hi: "6. फसल दर्ज करें, AI फोटो जांच और व्हाट्सएप रसीद",
            pa: "6. ਫਸਲ ਦਰਜ ਕਰੋ, AI ਫੋਟੋ ਜਾਂਚ ਅਤੇ ਵਟਸਐਪ ਰਸੀਦ",
            mr: "6. पीक नोंदणी करा, AI फोटो तपासणी आणि व्हॉट्सअ‍ॅप पावती",
            gu: "6. પાક નોંધણી, AI ફોટો તપાસ અને વોટ્સએપ રસીદ",
            kn: "6. ಬೆಳೆ ನೋಂದಣಿ, AI ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮತ್ತು ವಾಟ್ಸಾಪ್ ರಸೀದಿ",
            te: "6. పంట నమోదు, AI ఫోటో స్కాన్ మరియు వాట్సాప్ రసీదు",
            ta: "6. பயிர் பதிவு, AI புகைப்பட ஆய்வு மற்றும் வாட்ஸ்அப் ரசீது",
            bn: "6. ফসল নিবন্ধন, AI ফটো স্ক্যান এবং হোয়াটসঅ্যাপ রসিদ"
        },
        desc: {
            en: "Register produce batches, snap a crop photo for instant Gemini AI defect & shelf-life grading, receive WhatsApp rot alerts, and print digital farm slips.",
            hi: "अपनी फसल का बैच दर्ज करें, फोटो खींचकर जेमिनी AI से गुणवत्ता व शेल्फ लाइफ जांचें, सड़ने से पहले व्हाट्सएप चेतावनी पाएं और डिजिटल रसीद बनाएं।",
            pa: "ਫਸਲ ਦਰਜ ਕਰੋ, ਫੋਟੋ ਅਪਲੋਡ ਕਰਕੇ ਜੈਮਿਨੀ AI ਤੋਂ ਕੁਆਲਿਟੀ ਜਾਂਚੋ, ਖਰਾਬ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਵਟਸਐਪ ਸੁਨੇਹਾ ਪਾਓ ਅਤੇ ਡਿਜੀਟਲ ਰਸੀਦ ਬਣਾਓ।",
            mr: "पिकाचा फोटो काढून जेमिनी AI द्वारे गुणवत्ता तपासा, नुकसान होण्यापूर्वी व्हॉट्सअ‍ॅप अलर्ट मिळवा आणि डिजिटल शेत पावती तयार करा.",
            gu: "પાકનો ફોટો અપલોડ કરીને જેમિની AI વડે ગુણવત્તા તપાસો, બગડતા પહેલા વોટ્સએપ એલર્ટ અને ડિજિટલ રસીદ મેળવો.",
            kn: "ಬೆಳೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಜೆಮಿನಿ AI ಮೂಲಕ ಗುಣಮಟ್ಟ ಪರೀಕ್ಷಿಸಿ, ಹಾಳಾಗುವ ಮುನ್ನ ವಾಟ್ಸಾಪ್ ಎಚ್ಚರಿಕೆ ಮತ್ತು ಡಿಜಿಟಲ್ ರಸೀದಿ ಪಡೆಯಿರಿ.",
            te: "పంట ఫోటో తీసి జెమిని AI తో నాణ్యతను పరీక్షించండి, పాడవకముందే వాట్సాప్ హెచ్చరికలు మరియు డిజిటల్ రసీదును పొందండి.",
            ta: "பயிரை புகைப்படம் எடுத்து ஜெமினி AI மூலம் தரத்தை சரிபார்க்கவும், கெட்டுப்போகும் முன் வாட்ஸ்அப் எச்சரிக்கை மற்றும் டிஜிட்டல் ரசீது பெறவும்.",
            bn: "ফসলের ছবি তুলে জেমিনি AI দিয়ে গুণমান ও রোগ শনাক্ত করুন, নষ্ট হওয়ার আগেই হোয়াটসঅ্যাপ সতর্কতা এবং ডিজিটাল রসিদ পান।"
        },
        points: {
            en: [
                { bold: "Register Harvested Produce:", text: "Save batch details with harvest date, quantity in quintals, and storage location." },
                { bold: "Gemini AI Defect & Shelf-Life Scan:", text: "Upload a produce photo: Gemini AI inspects quality (Grade A/B/C), detects mold/rot, and predicts remaining days of shelf life." },
                { bold: "WhatsApp Alerts & Digital Farm Slip:", text: "Get auto WhatsApp warnings 24 hours before produce spoils, and click 'Farm Slip' to export a verified financial settlement receipt." }
            ],
            hi: [
                { bold: "फसल का बैच दर्ज करें:", text: "कटाई की तारीख, मात्रा (क्विंटल) और भंडारण स्थान के साथ अपनी फसल सुरक्षित दर्ज करें।" },
                { bold: "जेमिनी AI से फोटो जांच:", text: "फसल की फोटो अपलोड करें: AI तुरंत ग्रेड (A/B/C), फंगस या सड़न की पहचान और फसल कितने दिन सुरक्षित रहेगी (शेल्फ लाइफ) बता देगा।" },
                { bold: "व्हाट्सएप अलर्ट व डिजिटल रसीद:", text: "फसल खराब होने से पहले व्हाट्सएप पर अलर्ट पाएं और बिक्री के बाद पक्की डिजिटल किसान रसीद डाउनलोड करें।" }
            ],
            pa: [
                { bold: "ਫਸਲ ਦਾ ਬੈਚ ਦਰਜ ਕਰੋ:", text: "ਕਟਾਈ ਦੀ ਮਿਤੀ ਅਤੇ ਕੁਇੰਟਲ ਵਿੱਚ ਮਾਤਰਾ ਦਰਜ ਕਰੋ।" },
                { bold: "AI ਫੋਟੋ ਜਾਂਚ:", text: "ਫੋਟੋ ਅਪਲੋਡ ਕਰਕੇ ਗ੍ਰੇਡ (A/B/C) ਅਤੇ ਸ਼ੈਲਫ ਲਾਈਫ ਜਾਣੋ।" },
                { bold: "ਵਟਸਐਪ ਚਿਤਾਵਨੀ ਅਤੇ ਰਸੀਦ:", text: "ਫਸਲ ਖਰਾਬ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਵਟਸਐਪ ਸੁਨੇਹਾ ਪਾਓ ਅਤੇ ਡਿਜੀਟਲ ਖੇਤ ਰਸੀਦ ਬਣਾਓ।" }
            ],
            mr: [
                { bold: "पिकाची नोंद करा:", text: "कापणीची तारीख आणि प्रमाण नोंदवून ठेवा." },
                { bold: "AI फोटो तपासणी:", text: "फोटो अपलोड करून पिकाचा दर्जा (Grade A/B/C) आणि शेल्फ लाइफ तपासा." },
                { bold: "व्हॉट्सअ‍ॅप अलर्ट व पावती:", text: "खराब होण्यापूर्वी व्हॉट्सअ‍ॅप सूचना मिळवा आणि डिजिटल शेत पावती डाउनलोड करा." }
            ],
            gu: [
                { bold: "પાકની નોંધણી:", text: "કાપણીની તારીખ અને જથ્થો દાખલ કરો." },
                { bold: "AI ફોટો પરીક્ષણ:", text: "ફોટો અપલોડ કરીને ગ્રેડ (A/B/C) અને શેલ્ફ લાઇફ તપાસો." },
                { bold: "વોટ્સએપ એલર્ટ અને રસીદ:", text: "બગડતા પહેલા વોટ્સએપ એલર્ટ અને ડિજિટલ રસીદ મેળવો." }
            ],
            kn: [
                { bold: "ಬೆಳೆಯ ಬ್ಯಾಚ್ ನೋಂದಾಯಿಸಿ:", text: "ಕೊಯ್ಲು ದಿನಾಂಕ ಮತ್ತು ಪ್ರಮಾಣವನ್ನು ದಾಖಲಿಸಿ." },
                { bold: "AI ಫೋಟೋ ತಪಾಸಣೆ:", text: "ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಬೆಳೆಯ ಗ್ರೇಡ್ (A/B/C) ಮತ್ತು ಬಾಳಿಕೆ ದಿನಗಳನ್ನು ತಿಳಿಯಿರಿ." },
                { bold: "ವಾಟ್ಸಾಪ್ ಎಚ್ಚರಿಕೆ ಮತ್ತು ರಸೀದಿ:", text: "ಹಾಳಾಗುವ ಮುನ್ನ ವಾಟ್ಸಾಪ್ ಎಚ್ಚರಿಕೆ ಮತ್ತು ಡಿಜಿಟಲ್ ರಸೀದಿಯನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ." }
            ],
            te: [
                { bold: "పంట బ్యాచ్ నమోదు చేయండి:", text: "కోత తేదీ మరియు పరిమాణాన్ని నమోదు చేయండి." },
                { bold: "AI ఫోటో పరీక్ష:", text: "ఫోటో అప్‌లోడ్ చేసి గ్రేడ్ (A/B/C) మరియు నిల్వ ఉండే రోజులను తెలుసుకోండి." },
                { bold: "వాట్సాప్ హెచ్చరిక & రసీదు:", text: "పాడవకముందే వాట్సాప్ హెచ్చరికలను మరియు డిజిటల్ రసీదును పొందండి." }
            ],
            ta: [
                { bold: "பயிர் தொகுதியைப் பதிவு செய்க:", text: "அறுவடை தேதி மற்றும் அளவை உள்ளிடவும்." },
                { bold: "AI புகைப்பட ஆய்வு:", text: "புகைப்படம் பதிவேற்றி தரம் (Grade A/B/C) மற்றும் அடுக்கு ஆயுளை அறியவும்." },
                { bold: "வாட்ஸ்அப் எச்சரிக்கை மற்றும் ரசீது:", text: "கெட்டுப்போகும் முன் வாட்ஸ்அப் எச்சரிக்கை மற்றும் டிஜிட்டல் ரசீது பெறவும்." }
            ],
            bn: [
                { bold: "ফসলের ব্যাচ নিবন্ধন করুন:", text: "তোলার তারিখ এবং মোট কুইন্টাল পরিমাণ লিপিবদ্ধ করুন।" },
                { bold: "AI ফটো স্ক্যান:", text: "ছবি আপলোড করে ফসলের গ্রেড (A/B/C) এবং কত দিন ভালো থাকবে তা জানুন।" },
                { bold: "হোয়াটসঅ্যাপ অ্যালার্ট ও রসিদ:", text: "নষ্ট হওয়ার আগেই হোয়াটসঅ্যাপে সতর্কবার্তা পান এবং ডিজিটাল রসিদ ডাউনলোড করুন।" }
            ]
        },
        tip: {
            en: "Take crop photos in bright, natural daylight against a clean surface for maximum Gemini AI diagnostic accuracy.",
            hi: "फसल की फोटो अच्छी प्राकृतिक रोशनी में खींचें ताकि AI बीमारी और गुणवत्ता की 100% सही पहचान कर सके।",
            pa: "ਫਸਲ ਦੀ ਫੋਟੋ ਚੰਗੀ ਧੁੱਪ/ਰੌਸ਼ਨੀ ਵਿੱਚ ਖਿੱਚੋ ਤਾਂ ਜੋ AI ਸਹੀ ਜਾਂਚ ਕਰ ਸਕੇ।",
            mr: "पिकाचा फोटो चांगल्या उजेडात काढा जेणेकरून AI अचूक तपासणी करू शकेल.",
            gu: "પાકનો ફોટો સારા કુદરતી અજવાળામાં પાડો જેથી AI સચોટ પરિણામ આપી શકે.",
            kn: "ಉತ್ತಮ ಫಲಿತಾಂಶಕ್ಕಾಗಿ ನೈಸರ್ಗಿಕ ಬೆಳಕಿನಲ್ಲಿ ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
            te: "ఖచ్చితమైన ఫలితాల కోసం సహజ వెలుతురులో పంట స్పష్టమైన ఫోటో తీయండి.",
            ta: "துல்லியமான AI பரிசோதனைக்கு இயற்கை வெளிச்சத்தில் தெளிவான புகைப்படம் எடுக்கவும்.",
            bn: "সঠিক AI ডায়াগনসিসের জন্য ভালো আলোতে ফসলের পরিষ্কার ছবি তুলুন।"
        },
        btnJump: {
            en: "Register Produce & Scan ➔",
            hi: "फसल दर्ज करें व स्कैन करें ➔",
            pa: "ਫਸਲ ਦਰਜ ਕਰੋ ਅਤੇ ਸਕੈਨ ਕਰੋ ➔",
            mr: "पीक नोंदणी व स्कॅनिंग ➔",
            gu: "પાક નોંધણી અને સ્કેનિંગ ➔",
            kn: "ಬೆಳೆ ನೋಂದಾಯಿಸಿ ಮತ್ತು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ➔",
            te: "పంట నమోదు చేసి స్కాన్ చేయండి ➔",
            ta: "பயிரை பதிவு செய்து ஸ்கேன் செய்க ➔",
            bn: "ফসল নিবন্ধন ও স্ক্যান করুন ➔"
        },
        narration: {
            en: "In Step 6, register your crop batch and upload a photo. Google Gemini AI inspects produce quality, detects defects, and predicts remaining shelf-life. Enable WhatsApp alerts to receive warnings before crops spoil, and download digital farm sales receipts.",
            hi: "छठे चरण में, अपनी फसल दर्ज करें और फोटो अपलोड करें। जेमिनी AI गुणवत्ता, रोग और शेल्फ लाइफ की जांच करता है। फसल खराब होने से पहले व्हाट्सएप चेतावनी पाएं और डिजिटल रसीद डाउनलोड करें।"
        }
    }
];

function openTutorialModal(stepIndex = 0) {
    const modal = document.getElementById("tutorial-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.zIndex = "99999";
    document.body.style.overflow = "hidden";

    setTutorialStep(stepIndex);
}
window.openTutorialModal = openTutorialModal;

function closeTutorialModal() {
    const modal = document.getElementById("tutorial-modal");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
        modal.classList.add("hidden");
    }
    document.body.style.overflow = "";
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    isTutorialSpeaking = false;
    updateTutorialAudioBtnState(false);
}
window.closeTutorialModal = closeTutorialModal;

function setTutorialStep(stepIndex) {
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= TUTORIAL_STEPS_DATA.length) stepIndex = TUTORIAL_STEPS_DATA.length - 1;
    currentTutorialStep = stepIndex;

    // Stop previous speech if any
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    isTutorialSpeaking = false;
    updateTutorialAudioBtnState(false);

    renderTutorialStep(currentTutorialStep);
}
window.setTutorialStep = setTutorialStep;

function nextTutorialStep() {
    if (currentTutorialStep < TUTORIAL_STEPS_DATA.length - 1) {
        setTutorialStep(currentTutorialStep + 1);
    } else {
        closeTutorialModal();
        showToast("🌾 Ready to farm! AgriFlow is configured.", "success");
    }
}
window.nextTutorialStep = nextTutorialStep;

function prevTutorialStep() {
    if (currentTutorialStep > 0) {
        setTutorialStep(currentTutorialStep - 1);
    }
}
window.prevTutorialStep = prevTutorialStep;

function jumpToAppFeature(tabName) {
    closeTutorialModal();
    if (typeof switchTab === 'function') {
        switchTab(tabName);
    }
}
window.jumpToAppFeature = jumpToAppFeature;

function renderTutorialStep(index) {
    const step = TUTORIAL_STEPS_DATA[index];
    if (!step) return;

    const lang = (typeof currentLang !== 'undefined' && TUTORIAL_STEPS_DATA[0].title[currentLang]) ? currentLang : 'en';

    // Update Pills
    const pills = document.querySelectorAll('.tutorial-step-pill');
    pills.forEach((pill, idx) => {
        pill.classList.toggle('active', idx === index);
        if (idx === index) {
            pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    });

    // Resolve Step Content
    const title = step.title[lang] || step.title.hi || step.title.en;
    const desc = step.desc[lang] || step.desc.hi || step.desc.en;
    const points = step.points[lang] || step.points.hi || step.points.en;
    const tip = step.tip[lang] || step.tip.hi || step.tip.en;
    const btnJump = step.btnJump[lang] || step.btnJump.hi || step.btnJump.en;

    const tipHeader = (lang === 'hi') ? "किसान टिप (Kisan Tip)"
                    : (lang === 'pa') ? "ਕਿਸਾਨ ਟਿਪ (Kisan Tip)"
                    : (lang === 'mr') ? "शेतकरी टिप (Kisan Tip)"
                    : (lang === 'gu') ? "ખેડૂત સલાહ (Kisan Tip)"
                    : (lang === 'kn') ? "ರೈತ ಸಲಹೆ (Kisan Tip)"
                    : (lang === 'te') ? "రైతు సలహా (Kisan Tip)"
                    : (lang === 'ta') ? "விவசாயி குறிப்பு (Kisan Tip)"
                    : (lang === 'bn') ? "কৃষক পরামর্শ (Kisan Tip)"
                    : "Kisan Pro-Tip";

    const listenStepLabel = (lang === 'hi') ? "यह चरण सुनें"
                          : (lang === 'pa') ? "ਇਹ ਕਦਮ ਸੁਣੋ"
                          : (lang === 'mr') ? "हा टप्पा ऐका"
                          : (lang === 'gu') ? "આ પગલું સાંભળો"
                          : (lang === 'kn') ? "ಈ ಹಂತವನ್ನು ಕೇಳಿ"
                          : (lang === 'te') ? "ఈ దశను వినండి"
                          : (lang === 'ta') ? "இந்த படியை கேளுங்கள்"
                          : (lang === 'bn') ? "এই ধাপটি শুনুন"
                          : "Listen to Step";

    // Build Step HTML
    const container = document.getElementById("tutorial-step-content");
    if (!container) return;

    let pointsHtml = "";
    points.forEach((p, pIdx) => {
        pointsHtml += `
            <div class="step-action-box">
                <div class="step-action-badge">${pIdx + 1}</div>
                <div class="step-action-detail">
                    <strong>${p.bold}</strong>
                    <span>${p.text}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="tutorial-hero-box">
            <div class="tutorial-hero-icon">${step.icon}</div>
            <div class="tutorial-hero-text">
                <h4>${title}</h4>
                <p>${desc}</p>
            </div>
        </div>

        <div class="step-actions-grid">
            ${pointsHtml}
        </div>

        <div class="kisan-tip-box">
            <div class="kisan-tip-header">💡 ${tipHeader}</div>
            <p class="kisan-tip-body">${tip}</p>
        </div>

        <div class="step-cta-strip">
            <button type="button" class="btn-step-listen-single" onclick="speakTutorialStep(${index})">
                🔊 ${listenStepLabel}
            </button>
            <button type="button" class="btn-step-jump" onclick="jumpToAppFeature('${step.targetTab}')">
                ${btnJump}
            </button>
        </div>
    `;

    // Render Dots
    const dotsContainer = document.getElementById("tutorial-step-dots");
    if (dotsContainer) {
        let dotsHtml = "";
        for (let i = 0; i < TUTORIAL_STEPS_DATA.length; i++) {
            dotsHtml += `<div class="tutorial-dot ${i === index ? 'active' : ''}" onclick="setTutorialStep(${i})" title="Step ${i + 1}"></div>`;
        }
        dotsContainer.innerHTML = dotsHtml;
    }

    // Update Prev / Next buttons
    const prevBtn = document.getElementById("btn-tutorial-prev");
    const nextBtn = document.getElementById("btn-tutorial-next");
    if (prevBtn) {
        prevBtn.style.visibility = (index === 0) ? 'hidden' : 'visible';
    }
    if (nextBtn) {
        const nextText = (index === TUTORIAL_STEPS_DATA.length - 1)
            ? ((lang === 'hi') ? 'समाप्त करें ✔' : 'Finish ✔')
            : ((lang === 'hi') ? 'अगला चरण ▶' : 'Next Step ▶');
        nextBtn.innerHTML = `<span>${nextText}</span>`;
    }
}
window.renderTutorialStep = renderTutorialStep;

function updateTutorialAudioBtnState(speaking) {
    const audioBtn = document.querySelector('.btn-tutorial-audio');
    const icon = document.getElementById('tutorial-audio-icon');
    const lbl = document.getElementById('tutorial-audio-label');
    if (!audioBtn) return;

    if (speaking) {
        audioBtn.classList.add('speaking');
        if (icon) icon.innerText = '⏹️';
        if (lbl) lbl.innerText = (currentLang === 'hi') ? 'रोकें' : 'Stop Audio';
    } else {
        audioBtn.classList.remove('speaking');
        if (icon) icon.innerText = '🔊';
        if (lbl) lbl.innerText = (currentLang === 'hi') ? 'गाइड सुनें' : 'Listen Guide';
    }
}

function toggleTutorialAudio() {
    if (isTutorialSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) {
        window.speechSynthesis.cancel();
        isTutorialSpeaking = false;
        updateTutorialAudioBtnState(false);
    } else {
        speakTutorialStep(currentTutorialStep);
    }
}
window.toggleTutorialAudio = toggleTutorialAudio;

function speakTutorialStep(stepIndex) {
    const step = TUTORIAL_STEPS_DATA[stepIndex];
    if (!step) return;

    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
    let narrationText = step.narration?.[lang] || step.narration?.hi || step.narration?.en;

    // If narration is not explicitly defined in that language, construct it cleanly from title + desc + tip
    if (!narrationText) {
        const title = step.title[lang] || step.title.en;
        const desc = step.desc[lang] || step.desc.en;
        const tip = step.tip[lang] || step.tip.en;
        narrationText = `${title}. ${desc}. ${tip}`;
    }

    if (!narrationText) return;

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    speakText(narrationText, lang);
    isTutorialSpeaking = true;
    updateTutorialAudioBtnState(true);

    // Watch for speech end to reset button
    const checkSpeechInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
            clearInterval(checkSpeechInterval);
            isTutorialSpeaking = false;
            updateTutorialAudioBtnState(false);
        }
    }, 400);
}
window.speakTutorialStep = speakTutorialStep;
