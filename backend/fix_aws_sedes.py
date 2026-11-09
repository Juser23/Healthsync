import re
with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/aws/backend/src/controllers/api.controller.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = "const result = await pool.request().query('SELECT DISTINCT sede_atencion FROM Medicos WHERE estado = 1');"
replacement = "const result = await pool.request().query(\"SELECT DISTINCT sede_atencion FROM Medicos WHERE CAST(estado AS VARCHAR) = '1' OR CAST(estado AS VARCHAR) = 'Activo'\");"

if target in content:
    content = content.replace(target, replacement)
else:
    print("NO ENCONTRADO TARGET")

with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/aws/backend/src/controllers/api.controller.js', 'w', encoding='utf-8') as f:
    f.write(content)
