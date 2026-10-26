#!/usr/bin/env python3
"""Build a self-contained Apple Silicon .app; create its DMG after validation."""
import argparse,json,pathlib,plistlib,shutil,subprocess,struct
parser=argparse.ArgumentParser();parser.add_argument('--node',required=True,type=pathlib.Path);parser.add_argument('--work',required=True,type=pathlib.Path);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];work=args.work.resolve();node=args.node.resolve();work.mkdir(parents=True,exist_ok=True)
app=work/'Sparkboard.app';contents=app/'Contents';macos=contents/'MacOS';resources=contents/'Resources';web=resources/'web'
if app.exists():shutil.rmtree(app)
for directory in [macos,resources/'runtime',web/'desktop',web/'sandbox']:directory.mkdir(parents=True,exist_ok=True)
for filename in ['index.html','app.js','board-model.js','style.css','package.json','server.cjs','updater.cjs','update-client.js','update-client.css','update-public-key.pem']:shutil.copy2(root/filename,web/filename)
shutil.copy2(root/'desktop/run-desktop.cjs',web/'desktop/run-desktop.cjs')
shutil.copy2(root/'.sparkboard/sandbox/sparkboard-update.json',web/'sandbox/sparkboard-update.json')
shutil.copy2(node,resources/'runtime/node');shutil.copy2(node.parents[1]/'LICENSE',resources/'Node-LICENSE.txt')
version=json.loads((root/'package.json').read_text())['version']
plist={'CFBundleName':'Sparkboard','CFBundleDisplayName':'Sparkboard','CFBundleExecutable':'Sparkboard','CFBundleIdentifier':'com.sparkboard.local','CFBundlePackageType':'APPL','CFBundleShortVersionString':version,'CFBundleVersion':version,'CFBundleIconFile':'AppIcon','LSMinimumSystemVersion':'14.0','LSApplicationCategoryType':'public.app-category.productivity','NSHighResolutionCapable':True,'NSSupportsAutomaticTermination':False,'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True},'NSHumanReadableCopyright':'Sparkboard · Local workspace'}
with (contents/'Info.plist').open('wb') as stream:plistlib.dump(plist,stream)
cache=work/'ModuleCache';cache.mkdir(exist_ok=True)
subprocess.run(['xcrun','swiftc','-O','-target','arm64-apple-macos14.0','-module-cache-path',str(cache),str(root/'desktop/Launcher.swift'),'-framework','AppKit','-framework','WebKit','-o',str(macos/'Sparkboard')],check=True)
subprocess.run(['xcrun','swiftc','-O','-module-cache-path',str(cache),str(root/'desktop/Icon.swift'),'-framework','AppKit','-o',str(work/'make-icon')],check=True)
subprocess.run([str(work/'make-icon'),str(work/'AppIcon.png')],check=True)
iconset=work/'AppIcon.iconset';iconset.mkdir(exist_ok=True)
for size in [16,32,128,256,512]:
 for scale in [1,2]:
  target=iconset/f'icon_{size}x{size}{"@2x" if scale==2 else ""}.png'
  subprocess.run(['sips','-z',str(size*scale),str(size*scale),str(work/'AppIcon.png'),'--out',str(target)],check=True,stdout=subprocess.DEVNULL)
chunks=[]
for kind,filename in [('icp4','icon_16x16.png'),('icp5','icon_32x32.png'),('icp6','icon_32x32@2x.png'),('ic07','icon_128x128.png'),('ic08','icon_256x256.png'),('ic09','icon_512x512.png'),('ic10','icon_512x512@2x.png')]:
 data=(iconset/filename).read_bytes();chunks.append(kind.encode()+struct.pack('>I',len(data)+8)+data)
body=b''.join(chunks);(resources/'AppIcon.icns').write_bytes(b'icns'+struct.pack('>I',len(body)+8)+body)
subprocess.run(['codesign','--force','--sign','-','--identifier','com.sparkboard.local',str(app)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
print(f'Built {app}')
