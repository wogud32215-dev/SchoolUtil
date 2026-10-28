import fs from "node:fs";
import path from "node:path";
import rcedit from "rcedit";

/**
 * signAndEditExecutable: false 환경(코드 서명·winCodeSign 없음)에서도 exe에 icon.ico를 넣는다.
 * 바탕화면·시작 메뉴 바로가기는 exe 리소스 아이콘을 따른다.
 */
export default async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(context.packager.info.buildResourcesDir, "icon.ico");

  if (!fs.existsSync(exePath)) {
    throw new Error(`afterPack: exe not found: ${exePath}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`afterPack: icon not found: ${iconPath}`);
  }

  const { productName, description } = context.packager.appInfo;
  const version =
    context.packager.appInfo.shortVersion ||
    context.packager.appInfo.version;

  await rcedit(exePath, {
    icon: iconPath,
    "file-version": version,
    "product-version": version,
    "version-string": {
      FileDescription: description || productName,
      ProductName: productName,
      InternalName: path.basename(exeName, ".exe"),
    },
  });
}
