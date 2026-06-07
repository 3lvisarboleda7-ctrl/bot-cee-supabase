-- ============================================================
--  DATOS DE PRUEBA ALEATORIOS — Bot del CEE (UNI-FIIS)
--  Centro de Especialización Ejecutiva
--  Nombres reales al azar · marcador "[PRUEBA]" para limpiar fácil
--  Genera ~30 conversaciones simuladas con mensajes tipo chat real.
-- ============================================================
do $$
declare
  fn text[] := array['María','Carlos','Lucía','Diego','Valeria','José','Andrea','Luis',
                     'Camila','Jorge','Daniela','Miguel','Fernanda','Sofía','Renzo',
                     'Gabriela','Sebastián','Paola','Álvaro','Rosa'];
  ln text[] := array['González','Ramírez','Fernández','Torres','Quispe','Flores','Rojas',
                     'Vargas','Castillo','Mendoza','Huamán','Díaz','Salazar','Chávez',
                     'Ríos','Paredes','Ramos','Espinoza','Cáceres','Núñez'];
  qs text[] := array['¿Qué es el CEE?',
                     '¿Qué cursos de especialización tienen?',
                     '¿Cuándo empieza el curso de SSOMA?',
                     '¿Cómo me inscribo a un programa?',
                     '¿El certificado es a nombre de la UNI?',
                     '¿Cuánto cuesta el curso de gestión de calidad?',
                     '¿Las clases son virtuales o presenciales?',
                     '¿Tienen cursos de logística y procesos?'];
  ans text[] := array['El CEE es el Centro de Especialización Ejecutiva de la UNI-FIIS; brinda capacitación práctica de alta calidad en gestión, innovación, procesos, seguridad y más.',
                      'Ofrecemos programas en gestión, innovación, procesos, seguridad, logística, calidad y productividad. ¿Sobre cuál quieres más información?',
                      'El curso de Gestión de Seguridad, Salud Ocupacional y Medio Ambiente (SSOMA) inicia el 20 de junio. ¡Vacantes limitadas!',
                      'La inscripción es en línea: completas tus datos y un asesor te contacta. También puedes escribir al WhatsApp 966 644 502.',
                      'Sí, el certificado es emitido a nombre de la Universidad Nacional de Ingeniería (UNI).',
                      'Con gusto te paso la inversión y las formas de pago. Escríbenos a cee-fiis@uni.edu.pe para la información detallada.',
                      'Tenemos modalidades virtual y presencial según el programa. La mayoría son en vivo y quedan grabadas.',
                      'Sí, contamos con cursos especializados en logística, procesos, calidad y productividad.'];
  i int; t int; turns int; qi int;
  conv_id uuid; uid uuid; nombre text; ts timestamptz;
begin
  for i in 1..30 loop
    uid     := gen_random_uuid();
    nombre  := fn[1+floor(random()*array_length(fn,1))::int] || ' ' ||
               ln[1+floor(random()*array_length(ln,1))::int];
    ts      := now() - (floor(random()*25)||' days')::interval;
    conv_id := gen_random_uuid();

    insert into public.conversations(id, user_id, title, created_at, updated_at)
      values (conv_id, uid, nombre || ' — consulta CEE [PRUEBA]', ts, ts);

    turns := 1 + floor(random()*3)::int;
    for t in 1..turns loop
      qi := 1 + floor(random()*array_length(qs,1))::int;
      insert into public.messages(conversation_id, role, content, token_count, created_at)
        values (conv_id, 'user',      qs[qi],  8+floor(random()*8)::int,  ts + ((t*2-1)||' minutes')::interval);
      insert into public.messages(conversation_id, role, content, token_count, created_at)
        values (conv_id, 'assistant', ans[qi], 25+floor(random()*20)::int, ts + ((t*2)||' minutes')::interval);
    end loop;
  end loop;
end $$;

-- Verificación (todo en una sola tabla)
select 'Conversaciones [PRUEBA]' as tipo, count(*) as total
from public.conversations where title like '%[PRUEBA]'
union all
select 'Mensajes de [PRUEBA]', count(*)
from public.messages m
join public.conversations c on c.id = m.conversation_id
where c.title like '%[PRUEBA]';
