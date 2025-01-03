document.addEventListener("DOMContentLoaded", async () => {

    const calendar = document.getElementById("calendar");
    const locationDisplay = document.getElementById("location");
    let highlightedDayElement = null;

    initializeRamadanCalendar();

    // Add timer to highlighted day element.
    function addTimerToHighlightedDayElement(iftar) {
        if (highlightedDayElement && iftar !== "N/A") {
            let currentDate = new Date();
            const [time, timeZone] = iftar.split(" ");
            const [hour, minute] = time.split(":");
            const iftarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), parseInt(hour, 10), parseInt(minute, 10), 0);
            const timeDiff = iftarDate - currentDate;
            if (timeDiff > 0) {
                highlightedDayElement.innerHTML += `<div class="timer"></div>`;
                updateTimer();
                const timerInterval = setInterval(updateTimer, 1000);
                function updateTimer() {
                    currentDate = new Date();
                    const timeDiff = iftarDate - currentDate;
                    if (timeDiff <= 0) {
                        clearInterval(timerInterval);
                        highlightedDayElement.querySelector('.timer').innerHTML = "Du hast es heute geschafft!";
                        highlightedDayElement.querySelector('.timer').classList.replace('timer', 'success');
                    } else {
                        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                        highlightedDayElement.querySelector('.timer').innerHTML = `Noch ${hours}:${minutes}:${seconds} bis Iftar`;
                    }
                }
            } else {
                highlightedDayElement.innerHTML += `<div class="success">Du hast es heute geschafft!</div>`;
            }
        }
    }

    // Get city name for a specific latitude and longtitude.
    async function getCityName(latitude, longitude) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.address.city || data.address.town || data.address.village || "Unbekannt";
        } catch (error) {
            throw new Error("Fehler beim Abrufen des Stadtnamens.");
        }
    }

    // Get location of user.
    async function getLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position.coords),
                    (error) => {
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                reject(new Error("Standortzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in Ihren Geräteeinstellungen."));
                                break;
                            case error.POSITION_UNAVAILABLE:
                                reject(new Error("Standortinformationen nicht verfügbar."));
                                break;
                            case error.TIMEOUT:
                                reject(new Error("Standortabfrage hat zu lange gedauert."));
                                break;
                            default:
                                reject(new Error("Ein unbekannter Fehler ist aufgetreten."));
                        }
                    }
                );
            } else {
                reject(new Error("Geolocation wird von diesem Browser nicht unterstützt."));
            }
        });
    }

    // Get location consent from local storage, if available and not older
    // than 14 days return positive location consent, else try get consent
    // from user.
    function getLocationConsent() {
        const consent = localStorage.getItem("locationConsent");
        if (consent && new Date(consent) > new Date()) {
            return true;
        } else {
            const allowLocation = confirm("Um die Ramadantage anzuzeigen, benötigen wir Zugriff auf Ihren Standort. Möchten Sie fortfahren?");
            if (allowLocation) {
                let expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 14); // Expiration date +14 days
                localStorage.setItem("locationConsent", expiryDate.toISOString());
                return true;
            } else {
                return false;
            }
        }
    }

    // Get prayer times for a specific latitude, longtitude,
    // year, start month and a defined amount of months.
    async function getPrayerTimes(latitude, longitude, year, startMonth, amountOfMonths) {
        const url = `https://api.aladhan.com/v1/calendar?latitude=${latitude}&longitude=${longitude}&method=${amountOfMonths}&month=${startMonth}&year=${year}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === 200) {
                return data.data;
            } else {
                throw new Error("Fehler beim Abrufen der Gebetszeiten.");
            }
        } catch (error) {
            throw new Error("Fehler beim Abrufen der Gebetszeiten: " + error.message);
        }
    }

    // Initialize Ramadan calendar.
    async function initializeRamadanCalendar() {
        try {
            if (getLocationConsent()) {
                const { latitude: latitude, longitude: longitude } = await getLocation();
                const cityName = await getCityName(latitude, longitude);
                locationDisplay.textContent = `Standort: ${cityName}`;
                const ramadanStart = new Date("2024-12-12");
                const amountOfMonths = 2;
                const prayerTimes = await getPrayerTimes(latitude, longitude, ramadanStart.getFullYear(), ramadanStart.getMonth() + 1, amountOfMonths);
                renderRamadanCalendar(prayerTimes, ramadanStart);
                scrollToHighlightedDayElementIfExists();
            } else {
                throw new Error("Standortzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in Ihren Geräteeinstellungen.");
            }
        } catch (error) {
            showError(error.message);
        }
    }

    // Render calendar for specific prayer times.
    function renderRamadanCalendar(prayerTimes, ramadanStart) {
        const ramadanDays = 30;
        const currentDate = new Date();
        for (let i = 0; i < ramadanDays; i++) {
            const day = new Date(ramadanStart);
            day.setDate(ramadanStart.getDate() + i);
            const dateString = day.toLocaleDateString("de-DE", { weekday: 'long', day: 'numeric', month: 'long' });
            let suhur = prayerTimes[i]?.timings?.Imsak || "N/A";
            if (suhur !== "N/A") {
                suhur = setMinutesForPrayerTime(suhur, -10);
            }
            let iftar = prayerTimes[i]?.timings?.Maghrib || "N/A";
            if (iftar !== "N/A") {
                iftar = setMinutesForPrayerTime(iftar, +6);
            }
            const div = document.createElement("div");
            div.classList.add("day");
            div.innerHTML = `
            <div class="date">${dateString}</div>
            <div class="time-group">
                <div class="time-label">Suhur:</div>
                <div class="time-value">${suhur}</div>
                <div class="time-label">Iftar:</div>
                <div class="time-value">${iftar}</div>
                <div class="time-label">Sunrise:</div>
                <div class="time-value">${prayerTimes[i]?.timings?.Sunrise}</div>
                <div class="time-label">Dhuhr:</div>
                <div class="time-value">${prayerTimes[i]?.timings?.Dhuhr}</div>
                <div class="time-label">Asr:</div>
                <div class="time-value">${prayerTimes[i]?.timings?.Asr}</div>
                <div class="time-label">Isha:</div>
                <div class="time-value">${prayerTimes[i]?.timings?.Isha}</div>
            </div>
            `;
            if (!highlightedDayElement) {
                if (day.getDate() === currentDate.getDate() &&
                    day.getMonth() === currentDate.getMonth() &&
                    day.getFullYear() === currentDate.getFullYear()) {
                    div.classList.add("highlight");
                    highlightedDayElement = div;
                    addTimerToHighlightedDayElement(iftar);
                }
            }
            calendar.appendChild(div);
        }
    }

    // Set minutes for prayer time.
    function setMinutesForPrayerTime(prayerTime, minutes) {
        const [time, timeZone] = prayerTime.split(" ");
        const [hour, minute] = time.split(":");
        const prayerTimeDate = new Date(1, 1, 1, parseInt(hour, 10), parseInt(minute, 10), 0);
        prayerTimeDate.setMinutes(prayerTimeDate.getMinutes() + minutes);
        return prayerTimeDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        }) + " " + timeZone;
    }

    // Scrolls to highlighted day element if exists.
    function scrollToHighlightedDayElementIfExists() {
        if (highlightedDayElement) {
            highlightedDayElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }

    // Show error messages on location display.
    function showError(message) {
        locationDisplay.textContent = `${message}`;
    }

});