# Torneos Virtuales (PWA) — v0.2

App para torneos de fútbol virtual entre **dos jugadores**, basada en `Torneo_Formato_Original.xlsx` (sin macros; toda la lógica está en fórmulas y fue reproducida en `engine.js`).

## Reglas del Excel implementadas
- 32 clubes, sorteo aleatorio al crear: 16 por jugador, 8 grupos de 4 (2+2). Grupos A–H.
- Solo cruces entre dueños distintos, ida y vuelta (4 partidos por club, 64 en total).
- Puntos configurables (3/1). Desempate: Pts → DG → GF → fair play (amarilla 1, roja 3; solo tarjetas de fase de grupos) → desempate manual (0–9, mayor arriba) → posición del sorteo.
- Clasifican 1.º y 2.º a octavos cuando el grupo tiene 8/8 jugados: 1A–2B, 1C–2D, 1E–2F, 1G–2H, 1B–2A, 1D–2C, 1F–2E, 1H–2G → cuartos → semifinales → final (+3.er puesto opcional).
- Ganador de eliminatoria: ganador manual/«regalo de cupo» > goles (incluye prórroga) > penales. Cruce del mismo dueño: se avisa y se elige quién avanza.
- Eventos (gol, asistencia, amarilla, roja, autogol) → goleadores, asistencias y disciplina (top 30, mismos desempates). Autogol suma al rival y no cuenta como gol del jugador. Marcador vs eventos se verifica.
- Panel: duelo entre jugadores, puntos/goles por jugador, clubes en octavos, podio, avance.

## 1. Ejecutar en local
```bash
npm test        # 7 pruebas del motor y la fusión
npx serve .     # abre http://localhost:3000
```
Sin Supabase la app funciona completa en un solo dispositivo (localStorage + service worker).

## 2. Publicar con HTTPS (necesario para instalar como app)
Sube la carpeta tal cual a Netlify, Vercel, Cloudflare Pages o GitHub Pages (todos dan HTTPS). Android: menú de Chrome → «Instalar app». iPhone: Safari → Compartir → «Añadir a pantalla de inicio».

## 3. Conectar dos celulares (Supabase, plan gratuito)
1. Crea un proyecto en supabase.com. **Authentication → Providers → activa «Allow anonymous sign-ins».**
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`.
3. **Project Settings → API**: copia `Project URL` y la clave **anon public** (nunca la `service_role`).
4. Copia `config.example.js` a `config.js` y pega esos dos valores. Vuelve a publicar.
5. Jugador 1: abre el torneo → «Compartir» → obtiene un código de 6 caracteres. Jugador 2: Inicio → «Unirme con código».
Seguridad: las tablas no son legibles directamente; todo pasa por funciones SQL que verifican que eres miembro (máx. 2 por torneo).
Sincronización: cada cambio se envía con control de revisión (concurrencia optimista) y cada 10 s se consulta el servidor. Si ambos editan **cosas distintas** se fusionan solos; si editan **lo mismo**, aparece un diálogo para elegir. Sin conexión los cambios quedan pendientes («📴») y se envían al volver.

## 4. Copias de seguridad
Panel → «Exportar copia» (JSON por torneo). El historial de cambios se guarda dentro del torneo y «Deshacer último resultado» revierte marcadores.

## 5. Problemas frecuentes
- «Falta configurar Supabase»: no existe `config.js` o está vacío.
- «No se pudo iniciar sesión anónima»: activa los inicios anónimos (paso 3.1).
- La app no se actualiza: cierra y reabre; el service worker usa red primero.
- «Por definir N» en equipos: la plantilla tiene menos de 32 equipos; edítalos en la pestaña Equipos.

## Estado honesto / pendiente
- **No probado contra un Supabase real** (sin red en el entorno de desarrollo): la lógica de fusión está probada con tests; el cliente REST y el SQL deben validarse la primera vez que los conectes.
- Sincronización por consulta cada 10 s, no Realtime (websocket).
- Plantillas: el formato del Excel exige 32 equipos. Mundial 2026 (48) y Champions (36) sortean 32 del conjunto; Eurocopa (24) y Copa América (16) se completan con «Por definir N» editables → **decisión pendiente de confirmar contigo**.
- Escudos/banderas: no incluidos (insignia neutral); los campos `flag`/`logo` existen en cada equipo.
- Reasignar propietario de un club (intercambio entre grupos) y validación cruzada contra el Excel con datos reales: pendientes.
- Edición de torneo importado (importar JSON): pendiente.
