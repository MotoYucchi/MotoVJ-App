import json, glob, os

presets = glob.glob('presets/*B2B*.json')
for p in presets:
    with open(p, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    preset_name = os.path.basename(p).replace('.json', '').lower()
    
    if 'layers' in data:
        for i, layer in enumerate(data['layers']):
            layer['id'] = f"layer-{preset_name}-{i+1}"
            
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
print("Updated 12 presets.")
