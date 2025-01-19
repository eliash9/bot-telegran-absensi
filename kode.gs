 
 function doPost(e) {
  var sheetId = "";  // ID Sheet
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("Absensi");
  var sheetKaryawan = SpreadsheetApp.openById(sheetId).getSheetByName("Karyawan");
  var data = JSON.parse(e.postData.contents);

  if (data.message) {
    var chatId = data.message.chat.id;
    var username = data.message.from.first_name;
    var message = data.message.text.toLowerCase().trim();

    if (message === "/daftar") {
    handleDaftar(sheetKaryawan, chatId, username, data.message.from.id);
    } else 
    if (message === "/laporan") {
      handleLaporan(sheet, chatId, username);
    } else 
    if (message === "/rekap") {
      rekapJamKerja(sheet, chatId, username);
    } else 
    if (message === "/rekapsemua") {
      rekapSemuaUser(sheet, chatId);
    } else 

    if (message === "/start" || message === "/absen") {
      sendInlineButton(chatId);
      sendKeyboardButton(chatId);
    } else if (message === "🟢 masuk") {
      handleAbsen(sheet, chatId, username, "Masuk");
    } else if (message === "🔴 pulang") {
      handleAbsen(sheet, chatId, username, "Pulang");
    } else {
      sendText(chatId, "Silakan gunakan tombol *Masuk* atau *Pulang* untuk mencatat absensi. /daftar untuk terima notif harian");
    }
  }

  

  if (data.callback_query) {
    var chatId = data.callback_query.message.chat.id;
    var username = data.callback_query.from.first_name;
    var action = data.callback_query.data;

    if (action === "masuk") {
      handleAbsen(sheet, chatId, username, "Masuk");
    } else if (action === "pulang") {
      handleAbsen(sheet, chatId, username, "Pulang");
    } else if (action === "laporan") {
      handleLaporan(sheet, chatId, username);
    }
  }
}

function handleDaftar(sheet, chatId, username, userId) {
  var data = sheet.getDataRange().getValues();
  var sudahTerdaftar = false;

  // Cek apakah user sudah terdaftar
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      sudahTerdaftar = true;
      break;
    }
  }

  if (sudahTerdaftar) {
    sendText(chatId, "📌 Kamu sudah terdaftar.");
  } else {
    sheet.appendRow([userId, username, Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")]);
    sendText(chatId, "✅ Pendaftaran berhasil! Kamu sudah terdaftar.");
  }
}

function sendDailyMessageToAll() {
  var sheetId = "";  
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("Karyawan");
  var data = sheet.getDataRange().getValues();

  var message = "Selamat pagi! Jangan Lupa Absensi sebelum bekerja.";

  data.forEach(function(row) {
    var chatId = row[0];
    if (chatId) {
      sendText(chatId, message);
    }
  });
}


// Fungsi utama untuk absen dengan validasi
function handleAbsen(sheet, chatId, username, status) {
  if (validateAbsen(sheet, username, status)) {
    saveAbsen(sheet, chatId, username, status);
  } else {
    sendText(chatId, `⚠️ Kamu sudah absen *${status}* hari ini!`);
  }
}

// Fungsi validasi agar tidak bisa absen 2 kali di tanggal yang sama
function validateAbsen(sheet, username, status) {
  var tanggalHariIni = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  var data = sheet.getDataRange().getDisplayValues();  // Ambil data sesuai tampilan di Sheet

  for (var i = data.length - 1; i >= 0; i--) {
    var nama = data[i][0].toLowerCase().trim();
    var tanggal = formatTanggal(data[i][1]);  // Format tanggal agar konsisten
    var statusAbsen = data[i][3].toLowerCase().trim();

    if (nama === username.toLowerCase().trim() && tanggal === tanggalHariIni && statusAbsen === status.toLowerCase().trim()) {
      return false;  // Sudah absen dengan status yang sama hari ini
    }
  }
  return true;  // Belum absen hari ini
}

// Fungsi untuk format tanggal dari Google Sheet ke yyyy-MM-dd
function formatTanggal(tanggal) {
  var dateObj = new Date(tanggal);
  return Utilities.formatDate(dateObj, "GMT+7", "yyyy-MM-dd");
}
function formatWaktu(waktu) {
  var dateObj = new Date(waktu);
  return Utilities.formatDate(dateObj, "GMT+7", "HH:mm:ss");
}


// Simpan data absen
function saveAbsen(sheet, chatId, username, status) {
  var tanggal = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  var waktu = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");
  sheet.appendRow([username, tanggal, waktu, status]);

  sendText(chatId, `✅ Absensi *${status}* Tanggal: ${tanggal} waktu: ${waktu} berhasil dicatat!`);
}

// Kirim pesan ke Telegram
function sendText(chatId, text) {
  var token = "";
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";
  var payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

// Tombol Inline (dalam chat)
function sendInlineButton(chatId) {
  var token = "";
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";

  var payload = {
    chat_id: chatId,
    text: "Silakan pilih absensi:",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: "🟢 Masuk", callback_data: "masuk" },
          { text: "🔴 Pulang", callback_data: "pulang" }
        ],
        [
          
          { text: "Laporan", callback_data: "laporan" }
        ]
      ]
    })
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

// Tombol Command (di bawah input)
function sendKeyboardButton(chatId) {
  var token = "";
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";

  var payload = {
    chat_id: chatId,
    text: "Gunakan tombol di bawah untuk absen:",
    reply_markup: JSON.stringify({
      keyboard: [
        [{ text: "🟢 Masuk" }, { text: "🔴 Pulang" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    })
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

function handleLaporanBulan(sheet,chatId,bulan){
  var laporan = hitungJamKerjaBulan(sheet, bulan);
  
  if (laporan.length === 0) {
    sendText(chatId, "Belum ada data absensi yang bisa ditampilkan.");
  } else {
    var pesan = "*📊 Laporan Jam Kerja*\n\n";
    pesan += "Bulan: *" + bulan + "*\n\n";
    pesan +="```\n";
    pesan += "Tanggal  | Masuk | Pulang | Durasi \n";
    //pesan += "---------------------------------------------------\n";

    laporan.forEach(function(row) {
      pesan += row.tanggal + " | " + row.masuk + " | " + row.pulang + " | " + row.durasi + "\n";
    });
    pesan +="```";
    sendText(chatId, pesan);
  }

}



// Fungsi untuk menangani perintah /laporan
function handleLaporan(sheet, chatId, username) {
  var laporan = hitungJamKerja(sheet, username);
  
  if (laporan.length === 0) {
    sendText(chatId, "Belum ada data absensi yang bisa ditampilkan.");
  } else {
    var pesan = "*📊 Laporan Jam Kerja*\n\n";
    pesan += "Nama: *" + username + "*\n\n";
    pesan +="```\n";
    pesan += "Tanggal  | Masuk | Pulang | Durasi \n";
    //pesan += "---------------------------------------------------\n";

    laporan.forEach(function(row) {
      pesan += row.tanggal + " | " + row.masuk + " | " + row.pulang + " | " + row.durasi + "\n";
    });
    pesan +="```";
    sendText(chatId, pesan);
  }
}

// Fungsi untuk menghitung jam kerja dengan format yang sesuai
function hitungJamKerja(sheet, username) {
  var data = sheet.getDataRange().getValues();
  var hasil = {};
  var laporan = [];

  // Loop semua data absensi
  for (var i = 1; i < data.length; i++) {
    var nama = data[i][0];
    var tanggal = formatTanggal(data[i][1]);
    var waktu = formatWaktu(data[i][2]);
    var status = data[i][3];

    if (nama.toLowerCase().trim() === username.toLowerCase().trim()) {
      if (!hasil[tanggal]) {
        hasil[tanggal] = { masuk: null, pulang: null };
      }

      // Pastikan waktu disimpan sebagai Date object
      var waktuLengkap = new Date(tanggal + " " + waktu);

      if (status.toLowerCase() === "masuk") {
        hasil[tanggal].masuk = waktuLengkap;
      } else if (status.toLowerCase() === "pulang") {
        hasil[tanggal].pulang = waktuLengkap;
      }
    }
  }

  // Hitung durasi jam kerja dan format tanggal/jam
  for (var tanggal in hasil) {
    var masuk = hasil[tanggal].masuk;
    var pulang = hasil[tanggal].pulang;

    if (masuk && pulang) {
      // Hitung durasi dalam jam
      var durasiJam = ((pulang - masuk) / (1000 * 60 * 60)).toFixed(2); 

      // Format tanggal dan jam agar lebih rapi
      var formattedTanggal = Utilities.formatDate(new Date(tanggal), "GMT+7", "dd-MM-yyyy");
      var formattedMasuk = Utilities.formatDate(new Date(masuk), "GMT+7", "HH:mm:ss");
      var formattedPulang = Utilities.formatDate(new Date(pulang), "GMT+7", "HH:mm:ss");

      laporan.push({
        tanggal: formattedTanggal,
        masuk: formattedMasuk,
        pulang: formattedPulang,
        durasi: durasiJam
      });
    }
  }

  return laporan;
}


function rekapJamKerja(sheet, chatId, username) {
  var laporan = hitungJamKerja(sheet, username);

  if (laporan.length === 0) {
    sendText(chatId, "Belum ada data absensi yang bisa ditampilkan.");
  } else {
    var totalHariKerja = laporan.length;
    var totalDurasi = 0;
    
    var pesan = "Rekap Laporan Jam Kerja\n";
    pesan += "Nama: *" + username + "*\n";
    pesan += "```\n";
    pesan += "Tanggal    | Masuk   | Pulang  | Durasi (Jam)\n";
    pesan += "-----------------------------------------\n";

    laporan.forEach(function(row) {
      pesan += row.tanggal + " | " + row.masuk + " | " + row.pulang + " | " + row.durasi + "\n";
      totalDurasi += parseFloat(row.durasi);
    });

    pesan += "-----------------------------------------\n";
    pesan += "Subtotal  : " + totalHariKerja + " hari | " + totalDurasi.toFixed(2) + " jam\n";
    pesan += "```";
    pesan += "\n*Total Keseluruhan:*\n";
    pesan += "Jumlah Hari Kerja: *" + totalHariKerja + "* hari\n";
    pesan += "Total Durasi    : *" + totalDurasi.toFixed(2) + "* jam";

    sendText(chatId, pesan);
  }
}


// Fungsi untuk merekap jam kerja seluruh user hanya untuk bulan saat ini
function rekapSemuaUser(sheet, chatId) {
  var data = sheet.getDataRange().getValues();
  var hasil = {};
  var currentDate = new Date();
  var currentMonth = currentDate.getMonth();
  var currentYear = currentDate.getFullYear();

  // Grup data berdasarkan username dan tanggal
  for (var i = 1; i < data.length; i++) {
    var nama = data[i][0];
    var tanggal = new Date(data[i][1]);
    var waktu = formatWaktu(data[i][2]);
    var status = data[i][3];

    // Filter hanya data pada bulan dan tahun saat ini
    if (tanggal.getMonth() === currentMonth && tanggal.getFullYear() === currentYear) {
      var formattedTanggal = formatTanggal(tanggal);
      if (!hasil[nama]) {
        hasil[nama] = {};
      }
      if (!hasil[nama][formattedTanggal]) {
        hasil[nama][formattedTanggal] = { masuk: null, pulang: null };
      }

      var waktuLengkap = new Date(formattedTanggal + " " + waktu);

      if (status.toLowerCase() === "masuk") {
        hasil[nama][formattedTanggal].masuk = waktuLengkap;
      } else if (status.toLowerCase() === "pulang") {
        hasil[nama][formattedTanggal].pulang = waktuLengkap;
      }
    }
  }
  const month = currentDate.toLocaleString('default', { month: 'long' });
  var pesan = "*📊 Rekap Jam Kerja Seluruh Karyawan " +month+" "+currentYear+" *\n";
  pesan += "```\n";

  for (var user in hasil) {
    var totalHari = 0;
    var totalDurasi = 0;
    pesan += "Nama: " + user + "\n";
    pesan += "Tanggal    | Masuk   | Pulang  | Durasi (Jam)\n";
    pesan += "-----------------------------------------\n";

    for (var tanggal in hasil[user]) {
      var masuk = hasil[user][tanggal].masuk;
      var pulang = hasil[user][tanggal].pulang;

      if (masuk && pulang) {
        var durasiJam = ((pulang - masuk) / (1000 * 60 * 60)).toFixed(2);
        var formattedTanggal = Utilities.formatDate(new Date(tanggal), "GMT+7", "dd-MM-yyyy");
        var formattedMasuk = Utilities.formatDate(new Date(masuk), "GMT+7", "HH:mm:ss");
        var formattedPulang = Utilities.formatDate(new Date(pulang), "GMT+7", "HH:mm:ss");

        pesan += formattedTanggal + " | " + formattedMasuk + " | " + formattedPulang + " | " + durasiJam + "\n";
        totalDurasi += parseFloat(durasiJam);
        totalHari++;
      }
    }
    pesan += "Subtotal  : " + totalHari + " hari | " + totalDurasi.toFixed(2) + " jam\n";
    pesan += "-----------------------------------------\n\n";
  }
  pesan += "```";
  sendText(chatId, pesan);
}



// Fungsi untuk merekap jam kerja seluruh user
function rekapSemuaUser2(sheet, chatId) {
  var data = sheet.getDataRange().getValues();
  var hasil = {};

  // Grup data berdasarkan username dan tanggal
  for (var i = 1; i < data.length; i++) {
    var nama = data[i][0];
    var tanggal = formatTanggal(data[i][1]);
    var waktu = formatWaktu(data[i][2]);
    var status = data[i][3];

    if (!hasil[nama]) {
      hasil[nama] = {};
    }
    if (!hasil[nama][tanggal]) {
      hasil[nama][tanggal] = { masuk: null, pulang: null };
    }

    var waktuLengkap = new Date(tanggal + " " + waktu);

    if (status.toLowerCase() === "masuk") {
      hasil[nama][tanggal].masuk = waktuLengkap;
    } else if (status.toLowerCase() === "pulang") {
      hasil[nama][tanggal].pulang = waktuLengkap;
    }
  }

  var pesan = "*📊 Rekap Jam Kerja Seluruh Karyawan*\n";
  pesan += "```";

  for (var user in hasil) {
    var totalHari = 0;
    var totalDurasi = 0;
    pesan += "Nama: *" + user + "*\n";
    pesan += "Tanggal    | Masuk   | Pulang  | Durasi (Jam)\n";
    pesan += "-----------------------------------------\n";

    for (var tanggal in hasil[user]) {
      var masuk = hasil[user][tanggal].masuk;
      var pulang = hasil[user][tanggal].pulang;

      if (masuk && pulang) {
        var durasiJam = ((pulang - masuk) / (1000 * 60 * 60)).toFixed(2);
        var formattedTanggal = Utilities.formatDate(new Date(tanggal), "GMT+7", "dd-MM-yyyy");
        var formattedMasuk = Utilities.formatDate(new Date(masuk), "GMT+7", "HH:mm:ss");
        var formattedPulang = Utilities.formatDate(new Date(pulang), "GMT+7", "HH:mm:ss");

        pesan += formattedTanggal + " | " + formattedMasuk + " | " + formattedPulang + " | " + durasiJam + "\n";
        totalDurasi += parseFloat(durasiJam);
        totalHari++;
      }
    }
    pesan += "Subtotal  : " + totalHari + " hari | " + totalDurasi.toFixed(2) + " jam\n";
    pesan += "-----------------------------------------\n\n";
  }
  pesan += "```";
  sendText(chatId, pesan);
}
