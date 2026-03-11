# Wompi - Paso a Producción

1. Reemplazar llaves sandbox por llaves live en Vercel (`WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`).
2. Cambiar `WOMPI_BASE_URL` a endpoint de producción de Wompi.
3. Configurar webhook público de producción: `https://TU_DOMINIO/api/wompi/webhook`.
4. Verificar firma de eventos y logging en Vercel Functions.
5. Ejecutar pruebas E2E con transacciones reales de bajo monto.
6. Validar manejo de estados `APPROVED`, `DECLINED`, `ERROR`, `VOIDED`, `PENDING`.
7. Revisar políticas RLS y permisos de `SUPABASE_SERVICE_ROLE_KEY`.
8. Activar monitoreo de errores (Vercel + logs de Supabase).
