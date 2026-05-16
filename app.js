class Graph {
    constructor() { this.nodes = new Map(); this.edges = []; }
    addNode(id, name, lat, lng, type) { this.nodes.set(id, { id, name, lat, lng, type }); }
    addEdge(u, v) {
        const n1 = this.nodes.get(u), n2 = this.nodes.get(v);
        const d = this.haversine(n1.lat, n1.lng, n2.lat, n2.lng);
        this.edges.push({ u, v, d, weight: 1, blocked: false }, { u: v, v: u, d, weight: 1, blocked: false });
    }
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    dijkstra(start, end) {
        const dists = {}, prev = {}, q = new Set();
        this.nodes.forEach((_, id) => { dists[id] = id === start ? 0 : Infinity; q.add(id); });
        while (q.size > 0) {
            let u = [...q].reduce((min, id) => dists[id] < dists[min] ? id : min);
            if (dists[u] === Infinity || u === end) break;
            q.delete(u);
            this.edges.filter(e => e.u === u && !e.blocked).forEach(e => {
                let alt = dists[u] + (e.d * e.weight);
                if (alt < dists[e.v]) { dists[e.v] = alt; prev[e.v] = u; }
            });
        }
        const path = [];
        for (let at = end; at; at = prev[at]) path.unshift(at);
        return path[0] === start ? { path, cost: dists[end] } : null;
    }
    tsp(start, targets) {
        let current = start, unvisited = new Set(targets), full = [], total = 0;
        while (unvisited.size > 0) {
            let best = null, bestRes = null;
            unvisited.forEach(t => {
                const res = this.dijkstra(current, t);
                if (res && (!bestRes || res.cost < bestRes.cost)) { best = t; bestRes = res; }
            });
            if (!best) break;
            const seg = [...bestRes.path]; if (full.length > 0) seg.shift();
            full.push(...seg); total += bestRes.cost; current = best; unvisited.delete(best);
        }
        return full.length > 0 ? { path: [start, ...full], cost: total } : null;
    }
}

const engine = new Graph();
let map, routeLayer, blockLayer;
let activeRoute = null;
let dailyTotalCost = 0;
let dailyRoutes = 0;

const app = {
    init() {
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([6.2442, -75.5812], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        routeLayer = L.layerGroup().addTo(map);
        blockLayer = L.layerGroup().addTo(map);
        this.seed();
    },
    seed() {
        const hubs = [
            { id: 'H1', name: 'Hub Norte', lat: 6.3373, lng: -75.5579 },
            { id: 'H2', name: 'Hub Centro', lat: 6.2483, lng: -75.5746 }
        ];
        const clients = [
            { id: 'C1', name: 'Almacén 1', lat: 6.2422, lng: -75.5947 },
            { id: 'C2', name: 'Planta Sur', lat: 6.1759, lng: -75.5864 },
            { id: 'C3', name: 'Distribuidora Este', lat: 6.2091, lng: -75.5678 }
        ];

        [...hubs, ...clients].forEach(p => {
            const type = p.id.startsWith('H') ? 'hub' : 'client';
            engine.addNode(p.id, p.name, p.lat, p.lng, type);
            L.marker([p.lat, p.lng], {
                icon: L.divIcon({ className: 'bg-transparent', html: `<div class="${type === 'hub' ? 'marker-hub' : 'marker-client'}"></div>`, iconSize: [20, 20] })
            }).addTo(map).bindPopup(`<span class="text-slate-900 font-bold">${p.name}</span>`);
        });

        // Conexiones iniciales
        const ids = Array.from(engine.nodes.keys());
        ids.forEach(u => ids.forEach(v => { if (u !== v) engine.addEdge(u, v); }));

        const sel = document.getElementById('origin-sel');
        hubs.forEach(h => sel.add(new Option(h.name, h.id)));

        const cont = document.getElementById('clients-container');
        clients.forEach(c => {
            const d = document.createElement('div');
            d.innerHTML = `<label class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                <input type="checkbox" value="${c.id}" class="client-chk accent-indigo-500">
                <span class="text-[10px] font-bold text-slate-300">${c.name}</span>
            </label>`;
            cont.appendChild(d);
        });
    },
    logEvent(msg, type = 'info') {
        const mon = document.getElementById('event-monitor');
        const color = type === 'warn' ? 'text-orange-400' : (type === 'err' ? 'text-red-400' : 'text-slate-400');
        mon.innerHTML = `<p class="${color}">> [${new Date().toLocaleTimeString()}] ${msg}</p>` + mon.innerHTML;
    },
    optimize() {
        const origin = document.getElementById('origin-sel').value;
        const targets = Array.from(document.querySelectorAll('.client-chk:checked')).map(cb => cb.value);
        if (targets.length === 0) return this.logEvent("Error: No hay destinos seleccionados.", "err");

        const res = engine.tsp(origin, targets);
        if (res) {
            activeRoute = res;
            this.draw(res);
            document.getElementById('res-panel').classList.remove('hidden');
            document.getElementById('res-km').textContent = `${res.cost.toFixed(2)} km`;
            document.getElementById('res-cost').textContent = `$${(res.cost * 4500).toLocaleString()}`;
            this.logEvent(`Ruta calculada con éxito: ${res.cost.toFixed(2)}km`, "info");
        } else {
            this.logEvent("Error: No hay ruta posible (Bloqueo crítico aislando nodos)", "err");
        }
    },
    draw(res) {
        routeLayer.clearLayers();
        this.drawBlocks();
        const coords = res.path.map(id => [engine.nodes.get(id).lat, engine.nodes.get(id).lng]);
        L.polyline(coords, { color: '#818cf8', weight: 4, opacity: 0.9, dashArray: '8, 8' }).addTo(routeLayer);
        map.fitBounds(L.polyline(coords).getBounds(), { padding: [50, 50] });
    },
    drawBlocks() {
        blockLayer.clearLayers();
        engine.edges.forEach(e => {
            if (e.blocked) {
                const n1 = engine.nodes.get(e.u), n2 = engine.nodes.get(e.v);
                L.polyline([[n1.lat, n1.lng], [n2.lat, n2.lng]], { color: '#f87171', weight: 6, opacity: 0.8 }).addTo(blockLayer);
            }
        });
    },
    clearRoute() {
        document.getElementById('res-panel').classList.add('hidden');
        if (routeLayer) routeLayer.clearLayers();
        activeRoute = null;
        document.querySelectorAll('.client-chk').forEach(chk => chk.checked = false);

        const aiLog = document.getElementById('ai-log');
        if (aiLog) aiLog.textContent = "Listo para el análisis predictivo de Gemini.";

        this.logEvent("Ruta deseleccionada y resultados limpiados.", "info");
    },
    autoAssign() {
        const targets = Array.from(document.querySelectorAll('.client-chk:checked')).map(cb => cb.value);
        if (targets.length === 0) return this.logEvent("Error: No hay destinos seleccionados.", "err");

        const hubs = ['H1', 'H2'];
        const assigned = { 'H1': [], 'H2': [] };

        targets.forEach(t => {
            let bestHub = null;
            let minCost = Infinity;
            hubs.forEach(h => {
                const res = engine.dijkstra(h, t);
                if (res && res.cost < minCost) {
                    minCost = res.cost;
                    bestHub = h;
                }
            });
            if (bestHub) assigned[bestHub].push(t);
        });

        routeLayer.clearLayers();
        let totalCost = 0;
        let allPaths = [];
        const colors = ['#818cf8', '#34d399']; // Indigo, Emerald
        let colorIdx = 0;

        hubs.forEach(h => {
            if (assigned[h].length > 0) {
                const res = engine.tsp(h, assigned[h]);
                if (res) {
                    totalCost += res.cost;
                    allPaths.push(...res.path);
                    const coords = res.path.map(id => [engine.nodes.get(id).lat, engine.nodes.get(id).lng]);
                    L.polyline(coords, { color: colors[colorIdx % colors.length], weight: 4, opacity: 0.9, dashArray: '8, 8' }).addTo(routeLayer);
                }
            }
            colorIdx++;
        });

        if (allPaths.length === 0) {
            return this.logEvent("Error: No se pudo asignar ninguna ruta.", "err");
        }

        activeRoute = { path: allPaths, cost: totalCost };
        const allCoords = allPaths.map(id => [engine.nodes.get(id).lat, engine.nodes.get(id).lng]);
        map.fitBounds(L.polyline(allCoords).getBounds(), { padding: [50, 50] });

        document.getElementById('res-panel').classList.remove('hidden');
        document.getElementById('res-km').textContent = `${totalCost.toFixed(2)} km`;
        document.getElementById('res-cost').textContent = `$${(totalCost * 4500).toLocaleString()}`;
        this.logEvent(`Asignación auto exitosa: ${totalCost.toFixed(2)}km totales`, "info");
    },
    confirmRoute() {
        if (!activeRoute) return;

        dailyTotalCost += (activeRoute.cost * 4500);
        dailyRoutes += 1;

        document.getElementById('daily-routes').textContent = `${dailyRoutes} Rutas`;
        document.getElementById('daily-cost').textContent = `$${dailyTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

        this.logEvent(`Ruta confirmada. Costo sumado al balance diario.`, "info");
        this.clearRoute();
    },
    simulate(type) {
        const edges = engine.edges.filter(e => !e.blocked);
        if (edges.length === 0) return;

        const target = edges[Math.floor(Math.random() * edges.length)];

        // Modificar la arista y su inversa para que el grafo bidireccional se mantenga coherente
        const reverseEdge = engine.edges.find(e => e.u === target.v && e.v === target.u);

        if (type === 'traffic') {
            target.weight = 10;
            if (reverseEdge) reverseEdge.weight = 10;
            this.logEvent(`Congestión severa detectada en conexión hacia ${engine.nodes.get(target.u).name}`, "warn");
            document.getElementById('network-status').textContent = "CONGESTION";
            document.getElementById('network-status').className = "text-[10px] text-orange-400 font-mono";
        } else {
            target.blocked = true;
            if (reverseEdge) reverseEdge.blocked = true;
            this.logEvent(`BLOQUEO VIAL total en conexión hacia ${engine.nodes.get(target.u).name}`, "err");
            document.getElementById('network-status').textContent = "BLOQUEO";
            document.getElementById('network-status').className = "text-[10px] text-red-400 font-mono";
        }
        this.drawBlocks();
        
        if (activeRoute) {
            // Verificar si el bloqueo afecta la ruta actual
            const isAffected = activeRoute.path.some((nodeId, index, array) => {
                if (index === 0) return false;
                const u = array[index - 1];
                const v = nodeId;
                return (u === target.u && v === target.v) || (u === target.v && v === target.u);
            });

            if (isAffected) {
                this.logEvent("⚠️ RUTA ACTUAL BLOQUEADA. Buscando alternativa con Dijkstra...", "warn");
                this.optimize();
            } else {
                this.logEvent("Nota: El bloqueo no afecta la ruta actual, pero se actualizó el mapa.", "info");
            }
        }
    },
    resetNetwork() {
        engine.edges.forEach(e => {
            e.weight = 1;
            e.blocked = false;
        });
        this.logEvent("Red restablecida a condiciones normales de tráfico.", "info");
        document.getElementById('network-status').textContent = "ESTABLE";
        document.getElementById('network-status').className = "text-[10px] text-green-400 font-mono";
        this.drawBlocks();
        if (activeRoute) this.optimize();
    },
    async askGemini() {
        const aiLog = document.getElementById('ai-log');
        if (!activeRoute) {
            aiLog.textContent = "⚠️ Error: Calcula una ruta primero antes de consultar la estrategia.";
            return;
        }

        aiLog.innerHTML = `<span class="animate-pulse text-indigo-400">Consultando a Gemini 2.5 Flash vía Backend...</span>`;
        this.logEvent("Enviando telemetría al servidor backend...", "info");

        try {
            const nodosNombres = activeRoute.path.map(id => engine.nodes.get(id).name);
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    distancia: activeRoute.cost,
                    costo_combustible: `$${(activeRoute.cost * 1500).toLocaleString()}`,
                    costo_total: `$${(activeRoute.cost * 4500).toLocaleString()}`,
                    paradas: activeRoute.path.length,
                    nodos: nodosNombres
                })
            });

            if (!response.ok) {
                const errData = await response.text();
                throw new Error(`Error del servidor: ${response.status}. Detalle: ${errData}`);
            }

            const data = await response.json();

            if (data.analysis.includes("Nota del Sistema")) {
                aiLog.innerHTML = `<span class="text-orange-400">${data.analysis}</span>`;
            } else {
                aiLog.innerHTML = data.analysis.replace(/\n/g, '<br>');
                this.logEvent("Análisis del backend procesado exitosamente.", "info");
            }
        } catch (e) {
            console.error(e);
            if (e.message.includes("Error del servidor")) {
                aiLog.textContent = `❌ ${e.message}`;
                this.logEvent("El servidor procesó la petición pero ocurrió un error (ej. API Key inválida).", "err");
            } else {
                aiLog.textContent = "❌ Error de red. Asegúrate de estar usando http://localhost:8000 y que main.py esté corriendo.";
                this.logEvent("Error de red conectando con el backend.", "err");
            }
        }
    }
};

window.onload = () => app.init();
