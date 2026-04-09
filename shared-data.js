(function () {
  const FALLBACK_BUILDING_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%230d5c63'/><stop offset='1' stop-color='%23d7a86e'/></linearGradient></defs><rect width='1200' height='800' fill='%23ede2d3'/><rect x='120' y='180' width='360' height='460' rx='24' fill='url(%23g)' opacity='0.95'/><rect x='520' y='120' width='250' height='520' rx='24' fill='%232f241d' opacity='0.92'/><rect x='810' y='220' width='250' height='420' rx='24' fill='%230d5c63' opacity='0.88'/><rect y='650' width='1200' height='150' fill='%23f4efe7'/></svg>";
  const FALLBACK_ROOM_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%23f8f3ea'/><stop offset='1' stop-color='%23d8b38a'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/><rect x='120' y='120' width='960' height='520' rx='36' fill='%23fffaf2'/><rect x='180' y='200' width='310' height='270' rx='24' fill='%23d7a86e'/><rect x='540' y='220' width='420' height='170' rx='24' fill='%230d5c63'/><rect x='540' y='430' width='250' height='120' rx='20' fill='%232f241d'/><rect x='820' y='430' width='140' height='120' rx='20' fill='%23715d4e'/></svg>";

  function api(path, options) {
    return fetch(path, options).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }
      return data;
    });
  }

  function loadState() {
    return api("/api/state");
  }

  function saveState(state) {
    return api("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  }

  function getBuildingById(state, id) {
    return state.buildings.find((item) => item.id === id);
  }

  function getRoomsByBuilding(state, buildingId) {
    return state.rooms.filter((room) => room.buildingId === buildingId);
  }

  function loginAdmin(email, password) {
    return api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(() => true);
  }

  function logoutAdmin() {
    return api("/api/admin/logout", { method: "POST" });
  }

  function isAdminLoggedIn() {
    return api("/api/admin/session").then((data) => Boolean(data.authenticated));
  }

  function uploadFiles(files) {
    if (!files || !files.length) return Promise.resolve([]);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    return fetch("/api/upload", { method: "POST", body: formData })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Upload failed");
        return data.files || [];
      });
  }

  function safeImage(value, fallback) {
    return value && String(value).trim() ? value : fallback;
  }

  function statusLabel(status) {
    return {
      available: "Dang trong",
      occupied: "Da co khach",
      upcoming: "Sap trong",
    }[status] || status;
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString("vi-VN");
  }

  function buildingDetailLink(id) {
    return `building-detail.html?id=${encodeURIComponent(id)}`;
  }

  window.NovaData = {
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    loadState,
    saveState,
    getBuildingById,
    getRoomsByBuilding,
    loginAdmin,
    logoutAdmin,
    isAdminLoggedIn,
    uploadFiles,
    safeImage,
    statusLabel,
    formatDate,
    buildingDetailLink,
  };
})();
