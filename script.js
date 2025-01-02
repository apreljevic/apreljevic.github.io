document.addEventListener("DOMContentLoaded", async () => {

    const calendar = document.getElementById("calendar");
    const locationDisplay = document.getElementById("location");
    let highlightedDayElement = null;

    initializeRamadanCalendar();

    // Add timer to highlighted day element.
    function addTimerToHighlightedDayElement(iftar) {
        if (highlightedDayElement && iftar !== "N/A") {
            let currentDate = new Date();
            const iftarTime = new Date(`${currentDate.toLocaleDateString()} ${iftar}`);
            const timeDiff = iftarTime - currentDate;
            if (timeDiff > 0) {
                highlightedDayElement.innerHTML += `<div class="timer"></div>`;
                updateTimer();
                const timerInterval = setInterval(updateTimer, 1000);
                function updateTimer() {
                    currentDate = new Date();
                    const timeDiff = iftarTime - currentDate;
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
                                reject(new Error("Standortzugriff verweigert – bitte Einstellungen prüfen."));
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
            const { latitude: latitude, longitude: longitude } = await getLocation();
            const cityName = await getCityName(latitude, longitude);
            locationDisplay.textContent = `Standort: ${cityName}`;
            const ramadanStart = new Date("2024-12-09");
            const amountOfMonths = 2;
            const prayerTimes = await getPrayerTimes(latitude, longitude, ramadanStart.getFullYear(), ramadanStart.getMonth() + 1, amountOfMonths);
            renderRamadanCalendar(prayerTimes, ramadanStart);
            scrollToHighlightedDayElementIfExists();
        } catch (error) {
            showError(error.message);
        }
    }

    // Render calendar for specific prayer times.
    function renderRamadanCalendar(prayerTimes, ramadanStart) {
        const ramadanDays = 30;
        const currentDate = new Date();
        let hasTimer = false;
        for (let i = 0; i < ramadanDays; i++) {
            const day = new Date(ramadanStart);
            day.setDate(ramadanStart.getDate() + i);
            const dateString = day.toLocaleDateString("de-DE", { weekday: 'long', day: 'numeric', month: 'long' });
            let suhur = prayerTimes[i]?.timings?.Fajr || "N/A";
            // if (suhur !== "N/A") {
            //   const suhurTime = new Date(`${day.toLocaleDateString()} ${suhur}`);
            //   suhurTime.setMinutes(suhurTime.getMinutes() - 20);
            //   suhur = suhurTime.toLocaleTimeString("de-DE", {
            //     hour: "2-digit",
            //     minute: "2-digit",
            //   });
            // }
            const iftar = prayerTimes[i]?.timings?.Maghrib || "N/A";
            const div = document.createElement("div");
            div.classList.add("day");
            div.innerHTML = `
            <div class="date">${dateString}</div>
            <div class="time-info"><strong>Suhur:</strong> ${suhur}</div>
            <div class="time-info"><strong>Iftar:</strong> ${iftar}</div>
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