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

    let state = normalizeState(await loadState());
    const notice = document.getElementById("adminNotice");
    const contentForm = document.getElementById("contentForm");
    const companyForm = document.getElementById("companyForm");
    const statsForm = document.getElementById("statsForm");
    const buildingForm = document.getElementById("buildingForm");
    const roomForm = document.getElementById("roomForm");
    const adminAccountForm = document.getElementById("adminAccountForm");
    const buildingTableBody = document.getElementById("buildingTableBody");
    const adminRoomGrid = document.getElementById("adminRoomGrid");
    const adminAccountTableBody = document.getElementById("adminAccountTableBody");
    const buildingSearch = document.getElementById("buildingSearch");
    const roomSearch = document.getElementById("roomSearch");
    const roomStatusFilter = document.getElementById("roomStatusFilter");
    const adminSearch = document.getElementById("adminSearch");

    setupTabs();

    document.getElementById("logoutButton").addEventListener("click", async () => {
      await logoutAdmin();
      window.location.href = "admin-login.html";
    });

    document.getElementById("buildingResetButton").addEventListener("click", resetBuildingForm);
    document.getElementById("roomResetButton").addEventListener("click", resetRoomForm);
    document.getElementById("adminAccountResetButton").addEventListener("click", resetAdminAccountForm);

    [buildingSearch, roomSearch, roomStatusFilter, adminSearch].forEach((element) => {
      element.addEventListener("input", render);
      element.addEventListener("change", render);
    });

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
          name: clean(data.get("name")),
          logo: firstNonEmpty(logoUploads[0], data.get("logo"), state.company.logo),
          headline: clean(data.get("headline")),
          description: clean(data.get("description")),
          story: clean(data.get("story")),
          heroImage: firstNonEmpty(heroUploads[0], data.get("heroImage"), state.company.heroImage, FALLBACK_BUILDING_IMAGE),
          industry: clean(data.get("industry")),
          address: clean(data.get("address")),
          email: clean(data.get("email")),
          phone: clean(data.get("phone")),
          zalo: clean(data.get("zalo")),
          facebook: clean(data.get("facebook")),
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
          label: clean(data.get(`statLabel${index}`)),
          value: clean(data.get(`statValue${index}`)),
          note: clean(data.get(`statNote${index}`)),
        }));
        state.results = [1, 2, 3].map((index) => ({
          title: clean(data.get(`resultTitle${index}`)),
          description: clean(data.get(`resultDescription${index}`)),
        }));
        await persist("Đã lưu các chỉ số và nội dung kết quả.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu chỉ số.", "error");
      }
    });

    buildingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = new FormData(buildingForm);
        const id = clean(data.get("id")) || createId();
        const existing = state.buildings.find((building) => building.id === id);
        const imageUploads = await uploadFiles(buildingForm.elements.namedItem("imageFile").files);
        const galleryUploads = await uploadFiles(buildingForm.elements.namedItem("galleryFiles").files);

        const image = firstNonEmpty(imageUploads[0], data.get("image"), existing && existing.image, FALLBACK_BUILDING_IMAGE);
        const galleryFromText = clean(data.get("gallery"))
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
          name: clean(data.get("name")),
          region: clean(data.get("region")),
          address: clean(data.get("address")),
          image,
          gallery,
          floors: Number(data.get("floors")) || 0,
          occupancy: Number(data.get("occupancy")) || 0,
          averageRent: clean(data.get("averageRent")),
          investmentHighlight: clean(data.get("investmentHighlight")),
          description: clean(data.get("description")),
        };

        const index = state.buildings.findIndex((building) => building.id === id);
        if (index >= 0) state.buildings[index] = payload;
        else state.buildings.push(payload);

        state.rooms = state.rooms.map((room) =>
          room.buildingId === id ? extend(room, { region: payload.region }) : room
        );

        resetBuildingForm(false);
        await persist(index >= 0 ? "Đã cập nhật tòa nhà." : "Đã thêm tòa nhà mới.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu tòa nhà.", "error");
      }
    });

    roomForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = new FormData(roomForm);
        const id = clean(data.get("id")) || createId();
        const existing = state.rooms.find((room) => room.id === id);
        const roomUploads = await uploadFiles(roomForm.elements.namedItem("imageFile").files);

        const payload = {
          id,
          name: clean(data.get("name")),
          buildingId: clean(data.get("buildingId")),
          region: clean(data.get("region")),
          image: firstNonEmpty(roomUploads[0], data.get("image"), existing && existing.image, FALLBACK_ROOM_IMAGE),
          type: clean(data.get("type")),
          rent: clean(data.get("rent")),
          status: clean(data.get("status")),
          availableFrom: clean(data.get("availableFrom")),
          area: clean(data.get("area")),
          amenities: clean(data.get("amenities")),
        };

        const index = state.rooms.findIndex((room) => room.id === id);
        if (index >= 0) state.rooms[index] = payload;
        else state.rooms.push(payload);

        resetRoomForm(false);
        await persist(index >= 0 ? "Đã cập nhật phòng." : "Đã thêm phòng mới.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu phòng.", "error");
      }
    });

    adminAccountForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = new FormData(adminAccountForm);
        const id = clean(data.get("id")) || createId();
        const payload = {
          id,
          name: clean(data.get("name")),
          email: clean(data.get("email")).toLowerCase(),
          password: clean(data.get("password")),
        };

        if (state.admins.some((admin) => admin.email === payload.email && admin.id !== id)) {
          throw new Error("Email admin đã tồn tại.");
        }

        const index = state.admins.findIndex((admin) => admin.id === id);
        if (index >= 0) state.admins[index] = payload;
        else state.admins.push(payload);

        resetAdminAccountForm(false);
        await persist(index >= 0 ? "Đã cập nhật tài khoản admin." : "Đã thêm tài khoản admin.");
      } catch (error) {
        showNotice(error.message || "Không thể lưu tài khoản admin.", "error");
      }
    });

    render();

    async function persist(message) {
      showNotice("Đang lưu dữ liệu...", "info");
      state = normalizeState(state);
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
      renderAdminAccounts();
    }

    function fillContentForm() {
      eachEntry(state.content, (key, value) => {
        const field = contentForm.elements.namedItem(key);
        if (field) field.value = value || "";
      });
    }

    function fillCompanyForm() {
      eachEntry(state.company, (key, value) => {
        const field = companyForm.elements.namedItem(key);
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
      state.results.forEach((result, index) => {
        const idx = index + 1;
        const titleField = statsForm.elements.namedItem(`resultTitle${idx}`);
        const descriptionField = statsForm.elements.namedItem(`resultDescription${idx}`);
        if (titleField) titleField.value = result.title || "";
        if (descriptionField) descriptionField.value = result.description || "";
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
      const keyword = buildingSearch.value.trim().toLowerCase();
      const buildings = state.buildings.filter((building) =>
        [building.name, building.region, building.address].join(" ").toLowerCase().includes(keyword)
      );

      if (!buildings.length) {
        buildingTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">Không có tòa nhà phù hợp.</div></td></tr>';
        return;
      }

      buildingTableBody.innerHTML = "";
      buildings.forEach((building) => {
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
            activateTab("buildings");
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
      const keyword = roomSearch.value.trim().toLowerCase();
      const status = roomStatusFilter.value;
      const rooms = state.rooms.filter((room) => {
        const matchesKeyword = [room.name, room.region, room.type].join(" ").toLowerCase().includes(keyword);
        const matchesStatus = !status || room.status === status;
        return matchesKeyword && matchesStatus;
      });

      if (!rooms.length) {
        adminRoomGrid.innerHTML = '<div class="empty-state-card">Không có phòng phù hợp.</div>';
        return;
      }

      adminRoomGrid.innerHTML = "";
      rooms.forEach((room) => {
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
            activateTab("rooms");
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

    function renderAdminAccounts() {
      const keyword = adminSearch.value.trim().toLowerCase();
      const admins = state.admins.filter((admin) =>
        [admin.name, admin.email].join(" ").toLowerCase().includes(keyword)
      );

      if (!admins.length) {
        adminAccountTableBody.innerHTML = '<tr><td colspan="3"><div class="empty-state-inline">Không có tài khoản phù hợp.</div></td></tr>';
        return;
      }

      adminAccountTableBody.innerHTML = "";
      admins.forEach((admin) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${admin.name}</strong></td>
          <td>${admin.email}</td>
          <td>
            <div class="action-group">
              <button type="button" data-admin-action="edit" data-id="${admin.id}">Sửa</button>
              <button type="button" class="danger" data-admin-action="delete" data-id="${admin.id}">Xóa</button>
            </div>
          </td>
        `;
        adminAccountTableBody.appendChild(row);
      });

      adminAccountTableBody.querySelectorAll("[data-admin-action]").forEach((button) => {
        button.addEventListener("click", async () => {
          const admin = state.admins.find((item) => item.id === button.dataset.id);
          if (!admin) return;

          if (button.dataset.adminAction === "edit") {
            adminAccountForm.elements.id.value = admin.id;
            adminAccountForm.elements.name.value = admin.name;
            adminAccountForm.elements.email.value = admin.email;
            adminAccountForm.elements.password.value = admin.password;
            activateTab("admins");
            scrollToForm(adminAccountForm, "name");
            showNotice(`Đang chỉnh sửa tài khoản ${admin.email}.`, "info");
          }

          if (button.dataset.adminAction === "delete") {
            if (state.admins.length <= 1) {
              showNotice("Phải giữ lại ít nhất một tài khoản admin.", "error");
              return;
            }

            const confirmed = window.confirm(`Xóa tài khoản admin "${admin.email}"?`);
            if (!confirmed) return;
            state.admins = state.admins.filter((item) => item.id !== admin.id);
            await persist("Đã xóa tài khoản admin.");
          }
        });
      });
    }

    function resetBuildingForm(showMessage = true) {
      buildingForm.reset();
      buildingForm.elements.id.value = "";
      clearFileInputs(buildingForm);
      if (showMessage) showNotice("Đã làm mới form tòa nhà.", "info");
    }

    function resetRoomForm(showMessage = true) {
      roomForm.reset();
      roomForm.elements.id.value = "";
      clearFileInputs(roomForm);
      fillRoomBuildingOptions();
      if (showMessage) showNotice("Đã làm mới form phòng.", "info");
    }

    function resetAdminAccountForm(showMessage = true) {
      adminAccountForm.reset();
      adminAccountForm.elements.id.value = "";
      if (showMessage) showNotice("Đã làm mới form tài khoản admin.", "info");
    }

    function showNotice(message, tone) {
      notice.textContent = message;
      notice.className = `admin-notice admin-notice-${tone}`;
    }
  }

  function setupTabs() {
    document.querySelectorAll(".admin-tab").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.tab));
    });
  }

  function activateTab(tabName) {
    document.querySelectorAll(".admin-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    document.querySelectorAll(".admin-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === tabName);
    });
  }

  function normalizeState(state) {
    const nextState = Object.assign({}, state);
    const defaultAdmin = nextState.admin || { email: "admin@nova.vn", password: "123456" };
    nextState.admins = Array.isArray(nextState.admins) && nextState.admins.length
      ? nextState.admins
      : [{
          id: "admin-root",
          name: "Admin chính",
          email: defaultAdmin.email,
          password: defaultAdmin.password,
        }];
    nextState.admin = {
      email: nextState.admins[0].email,
      password: nextState.admins[0].password,
    };
    return nextState;
  }

  function clean(value) {
    return String(value || "").trim();
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
