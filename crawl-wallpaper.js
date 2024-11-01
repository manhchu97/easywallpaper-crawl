const fs = require("fs");
const path = require("path");
const axios = require("axios");
const wallpapers = require("./wallpapers.json");

// Hàm tải xuống file với số lần thử
async function downloadFile(url, folder, customFileName) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const fileName = customFileName || path.basename(url);
  const filePath = path.join(folder, fileName);

  if (fs.existsSync(filePath)) {
    console.log(`File "${fileName}" đã tồn tại. Không cần tải xuống nữa.`);
    return;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (error) {
      console.error(`Lỗi khi tải "${fileName}": ${error.message}. Lần thử ${attempt}/${maxRetries}...`);
      if (attempt === maxRetries) {
        console.error(`Không thể tải "${fileName}" sau ${maxRetries} lần.`);
      }
    }
  }
}

// Hàm tải wallpaper theo category
async function downloadByCategory(category, wallpapers) {
  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(18); // Giới hạn khoảng 18 yêu cầu đồng thời

  const downloadPromises = wallpapers.map((wallpaper, index) => {
    return limit(async () => {
      console.log(`--- Đang tải ${index + 1}/${wallpapers.length} trong category "${category}" ---`);
      await downloadFile(wallpaper.url, `./${wallpaper.path}`);
      console.log(`Đã tải xong: ${wallpaper.url}`);
    });
  });

  await Promise.all(downloadPromises);
  console.log(`Tất cả các ảnh trong category "${category}" đã được tải xong.`);
}

// Hàm chạy với tải song song theo category
async function run() {
  // Nhóm wallpaper theo category
  const categories = {};

  wallpapers.forEach((wallpaper) => {
    if (!categories[wallpaper.category]) {
      categories[wallpaper.category] = [];
    }
    categories[wallpaper.category].push(wallpaper);
  });

  // Tải wallpaper theo từng category
  for (const [category, wallpapers] of Object.entries(categories)) {
    await downloadByCategory(category, wallpapers);
  }
}

run();
