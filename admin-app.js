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
      hint.textContent = "Đang đăng nhập...";

      const data = new FormData(form);

      try {
        await loginAdmin(data.get("email"), data.get("password"));
        window.location.href = "admin-dashboard.html";
      } catch (error) {
        hint.textContent = error.message || "Sai email hoặc mật khẩu.";
      }
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
    const notice = document.getElementById("adminNotice");

    document.getElementById("logoutButton").addEventListener("click", async () => {
      await logoutAdmin();
      window.location.href = "admin-login.html";
    });

    document.getElementById("buildingResetButton").addEventListener("click", resetBuildingForm);
    document.getElementById("roomResetButton").addEventListener("click", resetRoomForm);

    contentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = new FormData(contentForm);
        const nextContent = {};

        eachEntry(state.content, (key) => {
          nextContent[key] = String(data.get(key) || "").trim();
        });

        state.content = nextContent;
        await persist("Đã lưu nội dung website.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu nội dung website.", "error");
      }
    });

    companyForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const data = new FormData(companyForm);
        const logoUploads = await uploadFiles(companyForm.elements.namedItem("logoFile").files);
        const heroUploads = await uploadFiles(companyForm.elements.namedItem("heroImageFile").files);

        state.company = {
          ...state.company,
          name: String(data.get("name") || "").trim(),
          logo: firstNonEmpty(logoUploads[0], data.get("logo"), state.company.logo),
          headline: String(data.get("headline") || "").trim(),
          description: String(data.get("description") || "").trim(),
          story: String(data.get("story") || "").trim(),
          heroImage: firstNonEmpty(heroUploads[0], data.get("heroImage"), state.company.heroImage, FALLBACK_BUILDING_IMAGE),
          industry: String(data.get("industry") || "").trim(),
          address: String(data.get("address") || "").trim(),
          email: String(data.get("email") || "").trim(),
          phone: String(data.get("phone") || "").trim(),
          zalo: String(data.get("zalo") || "").trim(),
          facebook: String(data.get("facebook") || "").trim(),
        };

        clearFileInputs(companyForm);
        await persist("Đã lưu thông tin công ty.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu thông tin công ty.", "error");
      }
    });

    statsForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const data = new FormData(statsForm);
        state.investorStats = [1, 2, 3, 4].map((index) => ({
          label: String(data.get(`statLabel${index}`) || "").trim(),
          value: String(data.get(`statValue${index}`) || "").trim(),
          note: String(data.get(`statNote${index}`) || "").trim(),
        }));

        await persist("Đã lưu các chỉ số vận hành.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu chỉ số.", "error");
      }
    });

    buildingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const data = new FormData(buildingForm);
        const id = String(data.get("id") || "").trim() || createId();
        const existing = state.buildings.find((building) => building.id === id);
        const imageUploads = await uploadFiles(buildingForm.elements.namedItem("imageFile").files);
        const galleryUploads = await uploadFiles(buildingForm.elements.namedItem("galleryFiles").files);

        const image = firstNonEmpty(
          imageUploads[0],
          data.get("image"),
          existing && existing.image,
          FALLBACK_BUILDING_IMAGE
        );

        const galleryFromText = String(data.get("gallery") || "")
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean);

        const gallery = galleryUploads.length
          ? galleryUploads
          : galleryFromText.length
            ? galleryFromText
            : existing && Array.isArray(existing.gallery) && existing.gallery.length
              ? existing.gallery
              : [image];

        const payload = {
          id,
          name: String(data.get("name") || "").trim(),
          region: String(data.get("region") || "").trim(),
          address: String(data.get("address") || "").trim(),
          image,
          gallery,
          floors: Number(data.get("floors")) || 0,
          occupancy: Number(data.get("occupancy")) || 0,
          averageRent: String(data.get("averageRent") || "").trim(),
          investmentHighlight: String(data.get("investmentHighlight") || "").trim(),
          description: String(data.get("description") || "").trim(),
        };

        const index = state.buildings.findIndex((building) => building.id === id);
        if (index >= 0) state.buildings[index] = payload;
        else state.buildings.push(payload);

        state.rooms = state.rooms.map((room) =>
          room.buildingId === id ? extend(room, { region: payload.region }) : room
        );

        resetBuildingForm();
        await persist(index >= 0 ? "Đã cập nhật tòa nhà." : "Đã thêm tòa nhà mới.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu tòa nhà.", "error");
      }
    });

    roomForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const data = new FormData(roomForm);
        const id = String(data.get("id") || "").trim() || createId();
        const existing = state.rooms.find((room) => room.id === id);
        const roomUploads = await uploadFiles(roomForm.elements.namedItem("imageFile").files);

        const payload = {
          id,
          name: String(data.get("name") || "").trim(),
          buildingId: String(data.get("buildingId") || "").trim(),
          region: String(data.get("region") || "").trim(),
          image: firstNonEmpty(roomUploads[0], data.get("image"), existing && existing.image, FALLBACK_ROOM_IMAGE),
          type: String(data.get("type") || "").trim(),
          rent: String(data.get("rent") || "").trim(),
          status: String(data.get("status") || "").trim(),
          availableFrom: String(data.get("availableFrom") || "").trim(),
          area: String(data.get("area") || "").trim(),
          amenities: String(data.get("amenities") || "").trim(),
        };

        const index = state.rooms.findIndex((room) => room.id === id);
        if (index >= 0) state.rooms[index] = payload;
        else state.rooms.push(payload);

        resetRoomForm();
        await persist(index >= 0 ? "Đã cập nhật phòng." : "Đã thêm phòng mới.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu phòng.", "error");
      }
    });

    render();

    async function persist(message) {
      showNotice("Đang lưu dữ liệu...", "info");
      await saveState(state);
      render();
      showNotice(message, "success");
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
        if (field) field.value = value || "";
      });
    }

    function fillContentForm() {
      eachEntry(state.content, (key, value) => {
        const field = contentForm.elements.namedItem(key);
        if (field) field.value = value || "";
      });
    }

    function fillStatsForm() {
      state.investorStats.forEach((stat, index) => {
        const idx = index + 1;
        statsForm.elements.namedItem(`statLabel${idx}`).value = stat.label || "";
        statsForm.elements.namedItem(`statValue${idx}`).value = stat.value || "";
        statsForm.elements.namedItem(`statNote${idx}`).value = stat.note || "";
      });
    }

    function fillRoomBuildingOptions() {
      const select = roomForm.elements.namedItem("buildingId");
      const currentValue = select.value;

      select.innerHTML = state.buildings
        .map((building) => `<option value="${building.id}">${building.name}</option>`)
        .join("");

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
      if (!state.buildings.length) {
        buildingTableBody.innerHTML =
          '<tr><td colspan="6"><div class="empty-state-inline">Chưa có tòa nhà nào.</div></td></tr>';
        return;
      }

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
              <button type="button" data-action="edit" data-id="${building.id}">Sửa</button>
              <button type="button" class="danger" data-action="delete" data-id="${building.id}">Xóa</button>
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
              if (field) field.value = Array.isArray(value) ? value.join("\n") : value || "";
            });
            scrollToForm(buildingForm, "name");
            showNotice(`Đang chỉnh sửa tòa nhà ${building.name}.`, "info");
          }

          if (button.dataset.action === "delete") {
            const confirmed = window.confirm(`Xóa tòa nhà "${building.name}" và toàn bộ phòng thuộc tòa nhà này?`);
            if (!confirmed) return;

            state.buildings = state.buildings.filter((item) => item.id !== building.id);
            state.rooms = state.rooms.filter((room) => room.buildingId !== building.id);
            await persist("Đã xóa tòa nhà và các phòng liên quan.");
          }
        });
      });
    }

    function renderRoomCards() {
      if (!state.rooms.length) {
        adminRoomGrid.innerHTML = '<div class="empty-state-card">Chưa có phòng nào trong hệ thống.</div>';
        return;
      }

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
          <p>${building ? building.name : "Không xác định"} | ${room.type}</p>
          <div class="room-meta">
            <div><strong>Khu vực:</strong> ${room.region}</div>
            <div><strong>Giá thuê:</strong> ${room.rent}</div>
            <div><strong>Ngày trống:</strong> ${formatDate(room.availableFrom)}</div>
          </div>
          <div class="room-actions">
            <button type="button" data-room-action="edit" data-id="${room.id}">Sửa</button>
            <button type="button" class="danger" data-room-action="delete" data-id="${room.id}">Xóa</button>
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
              if (field) field.value = value || "";
            });
            scrollToForm(roomForm, "name");
            showNotice(`Đang chỉnh sửa phòng ${room.name}.`, "info");
          }

          if (button.dataset.roomAction === "delete") {
            const confirmed = window.confirm(`Xóa phòng "${room.name}"?`);
            if (!confirmed) return;

            state.rooms = state.rooms.filter((item) => item.id !== room.id);
            await persist("Đã xóa phòng.");
          }
        });
      });
    }

    function resetBuildingForm() {
      buildingForm.reset();
      buildingForm.elements.id.value = "";
      clearFileInputs(buildingForm);
      showNotice("Đã làm mới form tòa nhà.", "info");
    }

    function resetRoomForm() {
      roomForm.reset();
      roomForm.elements.id.value = "";
      clearFileInputs(roomForm);
      fillRoomBuildingOptions();
      showNotice("Đã làm mới form phòng.", "info");
    }

    function showNotice(message, tone) {
      notice.textContent = message;
      notice.className = `admin-notice admin-notice-${tone}`;
    }
  }

  function clearFileInputs(form) {
    form.querySelectorAll('input[type="file"]').forEach((input) => {
      input.value = "";
    });
  }

  function scrollToForm(form, focusFieldName) {
    const section = form.closest(".content-section") || form;
    section.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      const field = form.elements.namedItem(focusFieldName);
      if (field && typeof field.focus === "function") field.focus();
    }, 320);
  }

  function firstNonEmpty() {
    for (const value of arguments) {
      if (value && String(value).trim()) return String(value).trim();
    }
    return "";
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
