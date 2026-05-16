#  Plataforma de Logística y Optimización de Entregas (Grafos)

![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![UCC](https://img.shields.io/badge/UCC-Estructura%20de%20Datos-red)

Sistema inteligente de gestión de rutas de "última milla" que utiliza teoría de grafos para optimizar la distribución de mercancías en entornos urbanos complejos. Este proyecto resuelve problemas de ruta mínima y el problema del viajante (TSP) mediante algoritmos avanzados.

## Características Principales

* **Modelado de Redes:** Representación de ciudades mediante grafos dirigidos ponderados.
* **Ruta Mínima (Dijkstra):** Cálculo del camino más corto entre un centro de distribución y un cliente, considerando distancias y tráfico.
* **Optimización Multi-Parada (Greedy TSP):** Algoritmo heurístico del "Vecino Más Cercano" para planificar rutas de entrega con múltiples destinos de forma eficiente.
* **Gestión de Incidencias en Tiempo Real:** Capacidad de bloquear/desbloquear vías y recalcular rutas de contingencia instantáneamente.
* **Asignación Inteligente:** Despacho automático de pedidos al repartidor más cercano mediante análisis de proximidad.

##  Stack Tecnológico

* **Lenguaje:** Python 3.10+
* **Estructuras de Datos:** * Listas de Adyacencia (implementadas con diccionarios para optimizar memoria).
    * Colas de Prioridad / Min-Heaps (para el motor de Dijkstra).
    * Conjuntos (Sets) para control de nodos visitados en tiempo $O(1)$.

##  Inicializacion
* ** Abrimos los archivos en el compilador
* ** Abrimos CMD
* ** Copiamos la ruta donde esta el proyecto
* ** La pegamos en el CMD
* ** Pegamos el comando venv\Scripts\activate; Asi activamos el entorno virtual
* ** Pegamso el comando python -m uvicorn main:app --reload; Asi ejecutamsos el progrmama
* ** En caso de no abrirse manualmente, pega el nuevo local.host
