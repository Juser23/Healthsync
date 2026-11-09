import re
with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/aws/backend/src/controllers/api.controller.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = "AND estado = 1"
replacement = "AND (CAST(estado AS VARCHAR) = '1' OR CAST(estado AS VARCHAR) = 'Activo')"

if target in content:
    content = content.replace(target, replacement)
else:
    print("NO ENCONTRADO TARGET ESTADO 1")

with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/aws/backend/src/controllers/api.controller.js', 'w', encoding='utf-8') as f:
    f.write(content)
