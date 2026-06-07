-- ============================================================
--  BORRAR SOLO los datos de prueba (marcador [PRUEBA])
--  No toca datos reales. Los mensajes caen por ON DELETE CASCADE.
-- ============================================================
delete from public.conversations where title like '%[PRUEBA]';

-- Verificar que quedó limpio (debe dar 0)
select count(*) as conversaciones_prueba_restantes
from public.conversations where title like '%[PRUEBA]';
