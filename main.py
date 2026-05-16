from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os 

app = FastAPI(title="SI-LOGIS Backend")
GEMINI_API_KEY = "AIzaSyCKiDtKa61rDeYmejupWvk7hoamX6UhSWc"
# Habilitar CORS por si acaso
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar API de Gemini
#GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class RouteData(BaseModel):
    distancia: float
    costo_combustible: str
    costo_total: str
    paradas: int
    nodos: list[str]

@app.post("/api/analyze")
async def analyze_route(data: RouteData):
    if not GEMINI_API_KEY:
        return {
            "analysis": (
                "**Nota del Sistema:** La integración con la IA no está configurada. "
                "Falta la clave de la API de Gemini en el backend."
            )
        }
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        Actúa como un analista experto en logística y resiliencia de cadenas de suministro.
        He calculado una ruta óptima con los siguientes datos:
        - Distancia total: {data.distancia:.2f} km
        - Costo de combustible proyectado: {data.costo_combustible}
        - Costo de operación total: {data.costo_total}
        - Número de paradas (clientes): {data.paradas}
        - Puntos visitados (en orden): {', '.join(data.nodos)}

        Basado en esta información, provee un breve y conciso análisis de eficiencia (máximo 3 párrafos cortos). 
        Enfócate en la relación costo/distancia, el impacto de las múltiples paradas, y recomendaciones de resiliencia 
        (ej. por qué es importante reaccionar ante tráfico o bloqueos en este tipo de ruta).
        Usa un tono profesional, técnico y directo.
        """
        response = model.generate_content(prompt)
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Servir archivos estáticos (frontend)
app.mount("/", StaticFiles(directory=".", html=True), name="static")
