(function () {
  const {
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    formatDate,
    isAdminLoggedIn,
    loadState,
    loginAdmin,
    logoutAdmin,
    safeImage,
    saveState,
    statusLabel,
    uploadFiles,
  } = window.NovaData;

  const page = document.body.dataset.page;
  if (page === "admin-login") initLoginPage();
  if (page === "admin-dashboard") initDashboard();

  async function initLoginPage() {
    const state = await loadState();
    applyManagedText(state.content);
    applyBrand(state.company, state.content);

    if (await isAdminLoggedIn()) {
      window.location.href = "admin-dashboard.html";
      return;
    }

    const form = document.getElementById("adminLoginForm");
    const hint = document.getElementById("loginHint");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      if (!(await loginAdmin(data.get("email"), data.get("password")))) {
        hint.textContent = "Sai email hoac mat khau.";
        return;
      }
      window.location.href = "admin-dashboard.html";
    });
  }

  async function initDashboard() {
    if (!(await isAdminLoggedIn())) {
      window.location.href = "admin-login.html";
      return;
    }

    let state = await loadState();
    const contentForm = document.getElementById("contentForm");
    const companyForm = document.getElementById("companyForm");
    const statsForm = document.getElementById("statsForm");
    const buildingForm = document.getElementById("buildingForm");
    const roomForm = document.getElementById("roomForm");
    const buildingTableBody = document.getElementById("buildingTableBody");
    const adminRoomGrid = document.getElementById("adminRoomGrid");

    document.getElementById("logoutButton").addEventListener("click", () => {
      logoutAdmin();
      window.location.href = "admin-login.html";
    });
    document.getElementById("buildingResetButton").addEventListener("click", resetBuildingForm);
    document.getElementById("roomResetButton").addEventListener("click", resetRoomForm);

    contentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(contentForm);
      const nextContent = {};
      eachEntry(state.content, (key) => {
        nextContent[key] = data.get(key);
      });
      state.content = nextContent;
      await persist();
    });

    companyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(companyForm);
      const logoUploads = await uploadFiles(companyForm.elements.namedItem("logoFile").files);
      const heroUploads = await uploadFiles(companyForm.elements.namedItem("heroImageFile").files);
      state.company = {
        ...state.company,
        name: data.get("name"),
        logo: logoUploads[0] || data.get("logo"),
        headline: data.get("headline"),
        description: data.get("description"),
        story: data.get("story"),
        heroImage: heroUploads[0] || data.get("heroImage"),
        industry: data.get("industry"),
        address: data.get("address"),
        email: data.get("email"),
        phone: data.get("phone"),
        zalo: data.get("zalo"),
        facebook: data.get("facebook"),
      };
      await persist();
    });

    statsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(statsForm);
      state.investorStats = [1, 2, 3, 4].map((index) => ({
        label: data.get(`statLabel${index}`),
        value: data.get(`statValue${index}`),
        note: data.get(`statNote${index}`),
      }));
      await persist();
    });

    buildingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(buildingForm);
      const id = data.get("id") || createId();
      const imageUploads = await uploadFiles(buildingForm.elements.namedItem("imageFile").files);
      const galleryUploads = await uploadFiles(buildingForm.elements.namedItem("galleryFiles").files);
      const payload = {
        id,
        name: data.get("name"),
        region: data.get("region"),
        address: data.get("address"),
        image: imageUploads[0] || data.get("image"),
        gallery: galleryUploads.length ? galleryUploads : String(data.get("gallery")).split(",").map((item) => item.trim()).filter(Boolean),
        floors: Number(data.get("floors")),
        occupancy: Number(data.get("occupancy")),
        averageRent: data.get("averageRent"),
        investmentHighlight: data.get("investmentHighlight"),
        description: data.get("description"),
      };
      const index = state.buildings.findIndex((building) => building.id === id);
      if (index >= 0) state.buildings[index] = payload;
      else state.buildings.push(payload);
      state.rooms = state.rooms.map((room) => room.buildingId === id ? extend(room, { region: payload.region }) : room);
      resetBuildingForm();
      await persist();
    });

    roomForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(roomForm);
      const id = data.get("id") || createId();
      const roomUploads = await uploadFiles(roomForm.elements.namedItem("imageFile").files);
      const payload = {
        id,
        name: data.get("name"),
        buildingId: data.get("buildingId"),
        region: data.get("region"),
        image: roomUploads[0] || data.get("image"),
        type: data.get("type"),
        rent: data.get("rent"),
        status: data.get("status"),
        availableFrom: data.get("availableFrom"),
        area: data.get("area"),
        amenities: data.get("amenities"),
      };
      const index = state.rooms.findIndex((room) => room.id === id);
      if (index >= 0) state.rooms[index] = payload;
      else state.rooms.push(payload);
      resetRoomForm();
      await persist();
    });

    render();

    async function persist() {
      await saveState(state);
      render();
    }

    function render() {
      document.getElementById("adminCompanyName").textContent = state.company.name;
      applyBrand(state.company, state.content);
      fillContentForm();
      fillCompanyForm();
      fillStatsForm();
      fillRoomBuildingOptions();
      renderBuildingTable();
      renderRoomCards();
    }

    function fillCompanyForm() {
      eachEntry(state.company, (key, value) => {
        const field = companyForm.elements.namedItem(key);
        if (field) field.value = value;
      });
    }

    function fillContentForm() {
      eachEntry(state.content, (key, value) => {
        const field = contentForm.elements.namedItem(key);
        if (field) field.value = value;
      });
    }

    function fillStatsForm() {
      state.investorStats.forEach((stat, index) => {
        const idx = index + 1;
        statsForm.elements.namedItem(`statLabel${idx}`).value = stat.label;
        statsForm.elements.namedItem(`statValue${idx}`).value = stat.value;
        statsForm.elements.namedItem(`statNote${idx}`).value = stat.note;
      });
    }

    function fillRoomBuildingOptions() {
      const select = roomForm.elements.namedItem("buildingId");
      const currentValue = select.value;
      select.innerHTML = state.buildings.map((building) => `<option value="${building.id}">${building.name}</option>`).join("");
      if (state.buildings.some((building) => building.id === currentValue)) {
        select.value = currentValue;
      } else if (state.buildings[0]) {
        select.value = state.buildings[0].id;
        roomForm.elements.namedItem("region").value = state.buildings[0].region;
      }
      select.onchange = () => {
        const building = state.buildings.find((item) => item.id === select.value);
        if (building) roomForm.elements.namedItem("region").value = building.region;
      };
    }

    function renderBuildingTable() {
      buildingTableBody.innerHTML = "";
      state.buildings.forEach((building) => {
        const roomCount = state.rooms.filter((room) => room.buildingId === building.id).length;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><div class="building-thumb"><img src="${safeImage(building.image, FALLBACK_BUILDING_IMAGE)}" alt="${building.name}"></div></td>
          <td><strong>${building.name}</strong><br><span>${building.address}</span></td>
          <td>${building.region}</td>
          <td>${roomCount}</td>
          <td>${building.occupancy}%</td>
          <td>
            <div class="action-group">
              <button type="button" data-action="edit" data-id="${building.id}">Sua</button>
              <button type="button" class="danger" data-action="delete" data-id="${building.id}">Xoa</button>
            </div>
          </td>
        `;
        buildingTableBody.appendChild(row);
      });

      buildingTableBody.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", async () => {
          const building = state.buildings.find((item) => item.id === button.dataset.id);
          if (!building) return;
          if (button.dataset.action === "edit") {
            eachEntry(building, (key, value) => {
              const field = buildingForm.elements.namedItem(key);
              if (field) field.value = Array.isArray(value) ? value.join(", ") : value;
            });
          }
          if (button.dataset.action === "delete") {
            const confirmed = window.confirm(`Xoa toa nha "${building.name}" va toan bo phong thuoc toa nha nay?`);
            if (!confirmed) return;
            state.buildings = state.buildings.filter((item) => item.id !== building.id);
            state.rooms = state.rooms.filter((room) => room.buildingId !== building.id);
            await persist();
          }
        });
      });
    }

    function renderRoomCards() {
      adminRoomGrid.innerHTML = "";
      state.rooms.forEach((room) => {
        const building = state.buildings.find((item) => item.id === room.buildingId);
        const card = document.createElement("article");
        card.className = "room-card";
        card.innerHTML = `
          <div class="room-visual">
            <img src="${safeImage(room.image, FALLBACK_ROOM_IMAGE)}" alt="${room.name}">
          </div>
          <span class="status-pill status-${room.status}">${statusLabel(room.status)}</span>
          <h3>${room.name}</h3>
          <p>${building ? building.name : "Khong xac dinh"} | ${room.type}</p>
          <div class="room-meta">
            <div><strong>Khu vuc:</strong> ${room.region}</div>
            <div><strong>Gia:</strong> ${room.rent}</div>
            <div><strong>Ngay trong:</strong> ${formatDate(room.availableFrom)}</div>
          </div>
          <div class="room-actions">
            <button type="button" data-room-action="edit" data-id="${room.id}">Sua</button>
            <button type="button" class="danger" data-room-action="delete" data-id="${room.id}">Xoa</button>
          </div>
        `;
        adminRoomGrid.appendChild(card);
      });

      adminRoomGrid.querySelectorAll("[data-room-action]").forEach((button) => {
        button.addEventListener("click", async () => {
          const room = state.rooms.find((item) => item.id === button.dataset.id);
          if (!room) return;
          if (button.dataset.roomAction === "edit") {
            eachEntry(room, (key, value) => {
              const field = roomForm.elements.namedItem(key);
              if (field) field.value = value;
            });
          }
          if (button.dataset.roomAction === "delete") {
            const confirmed = window.confirm(`Xoa phong "${room.name}"?`);
            if (!confirmed) return;
            state.rooms = state.rooms.filter((item) => item.id !== room.id);
            await persist();
          }
        });
      });
    }

    function resetBuildingForm() {
      buildingForm.reset();
      buildingForm.elements.id.value = "";
    }

    function resetRoomForm() {
      roomForm.reset();
      roomForm.elements.id.value = "";
      fillRoomBuildingOptions();
    }
  }

  function eachEntry(object, fn) {
    Object.keys(object).forEach((key) => fn(key, object[key]));
  }

  function applyManagedText(content) {
    setText("brandEyebrow", content.brandEyebrow);
    setText("navRoomsLabel", content.navRooms);
    setText("adminLoginTitle", content.adminLoginTitle);
    setText("adminLoginDescription", content.adminLoginDescription);
    setText("adminLoginButton", content.adminLoginButton);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function applyBrand(company, content) {
    const brandMarkText = document.getElementById("brandMarkText");
    const brandLogoImage = document.getElementById("brandLogoImage");
    const brandEyebrow = document.getElementById("brandEyebrow");

    if (brandEyebrow) brandEyebrow.textContent = content.brandEyebrow;
    if (!brandMarkText || !brandLogoImage) return;

    if (company.logo && String(company.logo).trim()) {
      brandLogoImage.src = company.logo;
      brandLogoImage.classList.remove("hidden");
      brandMarkText.classList.add("hidden");
    } else {
      brandLogoImage.classList.add("hidden");
      brandMarkText.classList.remove("hidden");
      brandMarkText.textContent = "";
    }
  }

  function extend(object, patch) {
    return Object.assign({}, object, patch);
  }

  function createId() {
    return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
})();
