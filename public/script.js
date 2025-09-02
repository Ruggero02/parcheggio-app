document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Inizializzazione della Mappa ---
    const map = L.map('map').setView([41.9028, 12.4964], 13); // Default a Roma
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    let carMarker = null; // Un solo marker per l'ultima posizione
    const apiUrl = '/api/parcheggi'; // Chiamiamo sempre l'API che ci dà la lista

    // --- 2. Funzioni Principali ---

    // Funzione per aggiornare la mappa con una nuova posizione
    function updateMap(lat, lng, timestamp) {
        if (carMarker) {
            map.removeLayer(carMarker);
        }

        // Crea il contenuto del popup con il pulsante "Portami qui"
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const googleMapsUrl = `https://www.google.com/maps?daddr=${lat},${lng}&dirflg=w`; // daddr=destination, dirflg=w per walking
        const popupContent = `
            <b>Auto Parcheggiata</b><br>
            Alle ore ${formattedDate}<br><br>
            <a href="${googleMapsUrl}" target="_blank">
                PORTAMI ALLA MACCHINA
            </a>
        `;

        carMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(popupContent)
            .openPopup();
        
        map.setView([lat, lng], 17);
    }

    // Funzione per salvare la posizione sul server
    async function savePosition(lat, lng) {
        try {
            const response = await fetch('/api/parcheggio', { // POST al singolare
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });

            if (!response.ok) throw new Error('Errore nel salvataggio');
            
            const result = await response.json();
            // Aggiorniamo la mappa con i dati appena salvati
            updateMap(result.data.latitude, result.data.longitude, result.data.timestamp);
            
            // Non usiamo più alert(), l'aggiornamento visivo è la conferma
            // alert('Posizione parcheggio salvata!');

        } catch (error) {
            console.error('Errore:', error);
            alert('Impossibile salvare la posizione. Riprova.');
        }
    }

    // --- 3. Gestione degli Eventi ---

    // Evento per il pulsante "Ho Parcheggiato Qui"
    document.getElementById('park-here-btn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            return alert('La geolocalizzazione non è supportata dal tuo browser.');
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                savePosition(position.coords.latitude, position.coords.longitude);
            },
            () => {
                alert('Impossibile ottenere la tua posizione. Assicurati di aver dato i permessi.');
            }
        );
    });

    // Evento per il click sulla mappa (parcheggio manuale)
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (confirm(`Vuoi registrare la posizione dell'auto qui?\nLat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`)) {
            savePosition(lat, lng);
        }
    });

    // --- 4. Caricamento Iniziale ---

    // Funzione per caricare solo L'ULTIMA posizione salvata all'avvio dell'app
    async function loadLastPosition() {
        try {
            const response = await fetch(apiUrl); // L'API ci dà la lista, ma noi useremo solo il primo elemento
            const result = await response.json();
            
            // Controlliamo se ci sono dati e se la lista non è vuota
            if (result.data && result.data.length > 0) {
                const lastParking = result.data[0]; // Prendiamo solo il primo (il più recente)
                updateMap(lastParking.latitude, lastParking.longitude, lastParking.timestamp);
            } else {
                // Se non ci sono parcheggi, centra sulla posizione dell'utente
                map.locate({setView: true, maxZoom: 16});
            }
        } catch (error) {
            console.error('Errore nel caricare la posizione:', error);
        }
    }

    // Carica l'ultima posizione salvata non appena la pagina è pronta
    loadLastPosition();
});