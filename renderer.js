// renderer.js
const QRCode = require("qrcode");
const Jimp = require("jimp");
const { ipcRenderer } = require("electron");
const jsQR = require("jsqr");

let qrBuffer = null;

// ⬇ SISTEM ZA WINDOW DUGMAD
document.getElementById("min-btn").onclick = () =>
  ipcRenderer.send("window-minimize");

document.getElementById("max-btn").onclick = () =>
  ipcRenderer.send("window-maximize");

document.getElementById("close-btn").onclick = () =>
  ipcRenderer.send("window-close");


// 👇 FUNKCIJA KOJA SE POZIVA IZ load-partials.js
// I REGISTRUJE HANDLERE NA UČITANIM ELEMENTIMA
window.attachHandlers = function (tabName) {

    // ---- GENERATE TAB ----
  if (tabName === "generate") {
    const generateBtn = document.getElementById("generateBtn");
    const saveBtn = document.getElementById("saveBtn");
    const textInput = document.getElementById("text");
    const fgInput = document.getElementById("qr-foreground");
    const bgInput = document.getElementById("qr-background");
    const sizeInput = document.getElementById("qr-size");
    const logoInput = document.getElementById("qr-logo");
    const previewImg = document.getElementById("qr-preview");
    const logoNameDiv = document.getElementById("qr-logo-name");

    logoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      logoNameDiv.textContent = file ? file.name : "No file selected";
    });

    generateBtn.onclick = async () => {
      const text = textInput.value.trim();
      if (!text) return alert("Enter some text!");

      const fg = fgInput.value || "#000000";
      const bg = bgInput.value || "#ffffff";
      const size = parseInt(sizeInput.value, 10) || 500;

      try {
        // Generiši QR
        const qrDataUrl = await QRCode.toDataURL(text, {
          margin: 2,
          width: size,
          color: { dark: fg, light: bg },
        });

        const qrImage = await Jimp.read(Buffer.from(qrDataUrl.split(",")[1], "base64"));

        // Ako korisnik ubacio logo
        if (logoInput.files && logoInput.files[0]) {
          const file = logoInput.files[0];
          const logoData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(Buffer.from(reader.result));
            reader.onerror = err => reject(err);
            reader.readAsArrayBuffer(file);
          });

          const logo = await Jimp.read(logoData);

          // Resize logo na 20% QR širine
          const logoSize = qrImage.bitmap.width * 0.2;
          logo.resize(logoSize, logoSize);

          const x = (qrImage.bitmap.width - logo.bitmap.width) / 2;
          const y = (qrImage.bitmap.height - logo.bitmap.height) / 2;

          qrImage.composite(logo, x, y);
        }

        // Prikaz i buffer
        qrBuffer = await qrImage.getBufferAsync(Jimp.MIME_PNG);
        previewImg.src = "data:image/png;base64," + qrBuffer.toString("base64");

        saveBtn.disabled = false;

        // Sačuvaj u history
        await saveToHistory("generated", text, "data:image/png;base64," + qrBuffer.toString("base64"));
      } catch (err) {
        console.error(err);
        alert("Error generating QR: " + err.message);
      }
    };

    saveBtn.onclick = async () => {
      if (!qrBuffer) return;
      try {
        const result = await ipcRenderer.invoke("save-dialog", qrBuffer);
        if (result) alert("Saved successfully!");
      } catch (err) {
        alert("Failed to save: " + err.message);
      }
    };
  }


    // ---- SCAN TAB ----
  if (tabName === "scan") {
      const fileInput = document.getElementById("scan-input");

      fileInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const img = new Image();
          img.src = file.path ? `file://${file.path}` : URL.createObjectURL(file);

          img.onload = async () => {
              const canvas = document.getElementById("scan-canvas");
              canvas.width = img.width;
              canvas.height = img.height;

              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, canvas.width, canvas.height);

              const resultText = code ? code.data : "No QR code detected!";
              document.getElementById("scan-result").innerText = resultText;

              // Sačuvaj u history samo ako je QR kod detektovan
              if (code) {
                  await saveToHistory("scanned", code.data, canvas.toDataURL("image/png"));
              }
          };
      });
  }


    // ---- HISTORY TAB ----
    if (tabName === "history") loadHistory();
};


async function saveToHistory(type, text, imageDataBase64) {
    // Učitaj postojeću istoriju
    const entries = await ipcRenderer.invoke("history-load");

    // Pronađi postojeći unos sa istim tipom i tekstom
    const existing = entries.find(e => e.type === type && e.text === text);

    if (existing) {
        // Ažuriraj datum i sliku
        existing.date = new Date().toISOString();
        existing.image = imageDataBase64;
        // Sačuvaj izmenjenu istoriju
        await ipcRenderer.invoke("history-set", entries);
    } else {
        // Dodaj novi unos
        const entry = {
            type, // "generated" or "scanned"
            text,
            image: imageDataBase64,
            date: new Date().toISOString()
        };
        await ipcRenderer.invoke("history-add", entry);
    }
}




async function loadHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "<p>Loading...</p>";

  const entries = await ipcRenderer.invoke("history-load");
  list.innerHTML = "";

  if (entries.length === 0) {
    list.innerHTML = "<p>No history yet.</p>";
    return;
  }

  entries.forEach(e => {
    const div = document.createElement("div");
    div.className = "history-item";

    div.innerHTML = `
      <img src="${e.image}">
      <div class="history-text">
        <b>${e.type.toUpperCase()}</b><br>
        ${e.text}<br>
        <small>${new Date(e.date).toLocaleString()}</small>
      </div>
    `;

    list.appendChild(div);
  });
}
