(function () {
  const {
    createCustomer,
    createRoom,
    deleteCustomer,
    deleteRoom,
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    formatDate,
    isAdminLoggedIn,
    loadCustomerById,
    loadCustomersPage,
    loadAdminBootstrap,
    loadRoomById,
    loadRoomsPage,
    loadState,
    loginAdmin,
    logoutAdmin,
    safeImage,
    saveState,
    statusLabel,
    updateCustomer,
    updateRoom,
    uploadFiles,
  } = window.NovaData;

  const page = document.body.dataset.page;
  const ROOM_PAGE_LIMIT = 12;

  if (page === "admin-login") initLoginPage();
  if (page === "admin-dashboard") initDashboard();

  async function initLoginPage() {
    try {
      const state = await loadState();
      applyManagedText(state.content || {});
      applyBrand(state.company || {}, state.content || {});

      if (await isAdminLoggedIn()) {
        window.location.href = "admin-dashboard.html";
        return;
      }

      const form = document.getElementById("adminLoginForm");
      const hint = document.getElementById("loginHint");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hint.textContent = "Đang đăng nhập...";

        try {
          const data = new FormData(form);
          await loginAdmin(data.get("email"), data.get("password"));
          window.location.href = "admin-dashboard.html";
        } catch (error) {
          hint.textContent = error.message || "Sai email hoặc mật khẩu.";
        }
      });
    } finally {
      document.body.classList.remove("app-loading");
    }
  }

  async function initDashboard() {
    try {
      if (!(await isAdminLoggedIn())) {
        window.location.href = "admin-login.html";
        return;
      }

      let state = normalizeState(await loadAdminBootstrap());
      let currentRoomItems = [];
      let currentCustomerItems = [];
      const roomPaging = { page: 1, totalPages: 1, totalItems: 0 };
      const customerPaging = { page: 1, totalPages: 1, totalItems: 0 };

      const notice = document.getElementById("adminNotice");
      const contentForm = document.getElementById("contentForm");
      const companyForm = document.getElementById("companyForm");
      const statsForm = document.getElementById("statsForm");
      const buildingForm = document.getElementById("buildingForm");
      const roomForm = document.getElementById("roomForm");
      const newsForm = document.getElementById("newsForm");
      const customerForm = document.getElementById("customerForm");
      const adminAccountForm = document.getElementById("adminAccountForm");
      const buildingTableBody = document.getElementById("buildingTableBody");
      const adminRoomGrid = document.getElementById("adminRoomGrid");
      const adminNewsGrid = document.getElementById("adminNewsGrid");
      const customerTableBody = document.getElementById("customerTableBody");
      const customerStatsGrid = document.getElementById("customerStatsGrid");
      const adminAccountTableBody = document.getElementById("adminAccountTableBody");
      const adminRoleBadge = document.getElementById("adminRoleBadge");
      const buildingSearch = document.getElementById("buildingSearch");
      const roomSearch = document.getElementById("roomSearch");
      const roomBuildingFilter = document.getElementById("roomBuildingFilter");
      const roomStatusFilter = document.getElementById("roomStatusFilter");
      const adminRoomsPrevButton = document.getElementById("adminRoomsPrevButton");
      const adminRoomsNextButton = document.getElementById("adminRoomsNextButton");
      const adminRoomsPagination = document.getElementById("adminRoomsPagination");
      const newsSearch = document.getElementById("newsSearch");
      const newsCategoryFilter = document.getElementById("newsCategoryFilter");
      const customerSearch = document.getElementById("customerSearch");
      const customerPlatformFilter = document.getElementById("customerPlatformFilter");
      const customerRegionFilter = document.getElementById("customerRegionFilter");
      const customerStatusFilter = document.getElementById("customerStatusFilter");
      const customerPlatformInput = document.getElementById("customerPlatformInput");
      const customerRegionInput = document.getElementById("customerRegionInput");
      const customerStatusInput = document.getElementById("customerStatusInput");
      const addCustomerPlatformButton = document.getElementById("addCustomerPlatformButton");
      const addCustomerRegionButton = document.getElementById("addCustomerRegionButton");
      const customersPrevButton = document.getElementById("customersPrevButton");
      const customersNextButton = document.getElementById("customersNextButton");
      const customersPagination = document.getElementById("customersPagination");
      const adminSearch = document.getElementById("adminSearch");
      const currentRole = ((state.meta && state.meta.session && state.meta.session.adminRole) || "admin").toLowerCase();
      const currentAdminName = (state.meta && state.meta.session && state.meta.session.adminName) || "";

      setupTabs();
      applyAccessControl(currentRole);
      if (adminRoleBadge) {
        adminRoleBadge.textContent = currentRole === "manager" ? `Quản lý${currentAdminName ? ` • ${currentAdminName}` : ""}` : `Admin${currentAdminName ? ` • ${currentAdminName}` : ""}`;
      }

      document.getElementById("logoutButton").addEventListener("click", async () => {
        await logoutAdmin();
        window.location.href = "admin-login.html";
      });
      document.getElementById("buildingResetButton").addEventListener("click", () => resetBuildingForm(true));
      document.getElementById("roomResetButton").addEventListener("click", () => resetRoomForm(true));
      document.getElementById("newsResetButton").addEventListener("click", () => resetNewsForm(true));
      document.getElementById("customerResetButton").addEventListener("click", () => resetCustomerForm(true));
      document.getElementById("adminAccountResetButton").addEventListener("click", () => resetAdminAccountForm(true));

      document.querySelectorAll(".editor-action").forEach((button) => {
        button.addEventListener("click", () => {
          const field = newsForm.elements.namedItem(button.dataset.editorTarget);
          if (!field) return;
          const insertText = String(button.dataset.editorInsert || "");
          const start = field.selectionStart || 0;
          const end = field.selectionEnd || 0;
          const value = field.value || "";
          field.value = `${value.slice(0, start)}${insertText}${value.slice(end)}`;
          const caret = start + insertText.length;
          field.focus();
          field.setSelectionRange(caret, caret);
        });
      });

      [buildingSearch, newsSearch, newsCategoryFilter, adminSearch].forEach((element) => {
        element.addEventListener("input", renderStatic);
        element.addEventListener("change", renderStatic);
      });
      [roomSearch, roomBuildingFilter, roomStatusFilter].forEach((element) => {
        element.addEventListener("input", handleRoomFilterChange);
        element.addEventListener("change", handleRoomFilterChange);
      });
      [customerSearch, customerPlatformFilter, customerRegionFilter, customerStatusFilter].forEach((element) => {
        element.addEventListener("input", handleCustomerFilterChange);
        element.addEventListener("change", handleCustomerFilterChange);
      });

      adminRoomsPrevButton.addEventListener("click", () => {
        if (roomPaging.page <= 1) return;
        roomPaging.page -= 1;
        refreshRooms();
      });
      adminRoomsNextButton.addEventListener("click", () => {
        if (roomPaging.page >= roomPaging.totalPages) return;
        roomPaging.page += 1;
        refreshRooms();
      });
      customersPrevButton.addEventListener("click", () => {
        if (customerPaging.page <= 1) return;
        customerPaging.page -= 1;
        refreshCustomers();
      });
      customersNextButton.addEventListener("click", () => {
        if (customerPaging.page >= customerPaging.totalPages) return;
        customerPaging.page += 1;
        refreshCustomers();
      });
      addCustomerPlatformButton.addEventListener("click", () => addCustomerOption("platform"));
      addCustomerRegionButton.addEventListener("click", () => addCustomerOption("region"));

      contentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const data = new FormData(contentForm);
          const nextContent = {};
          eachEntry(state.content, (key) => {
            nextContent[key] = clean(data.get(key));
          });
          state.content = nextContent;
          await persistMutation((fullState) => {
            fullState.content = state.content;
          }, "Đã lưu nội dung website.");
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
          await persistMutation((fullState) => {
            fullState.company = state.company;
          }, "Đã lưu thông tin công ty.");
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
          await persistMutation((fullState) => {
            fullState.investorStats = state.investorStats;
            fullState.results = state.results;
          }, "Đã lưu các chỉ số và nội dung kết quả.");
        } catch (error) {
          showNotice(error.message || "Không thể lưu chỉ số.", "error");
        }
      });

      buildingForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Đang lưu dữ liệu...", "info");
          const fullState = normalizeState(await loadState());
          const data = new FormData(buildingForm);
          const id = clean(data.get("id")) || createId("building");
          const existing = fullState.buildings.find((building) => building.id === id);
          const imageUploads = await uploadFiles(buildingForm.elements.namedItem("imageFile").files);
          const galleryUploads = await uploadFiles(buildingForm.elements.namedItem("galleryFiles").files);
          const image = firstNonEmpty(imageUploads[0], data.get("image"), existing && existing.image, FALLBACK_BUILDING_IMAGE);
          const galleryFromText = clean(data.get("gallery"))
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
          const payload = {
            id,
            name: clean(data.get("name")),
            region: clean(data.get("region")),
            address: clean(data.get("address")),
            image,
            gallery: galleryUploads.length
              ? galleryUploads
              : galleryFromText.length
                ? galleryFromText
                : existing && Array.isArray(existing.gallery) && existing.gallery.length
                  ? existing.gallery
                  : [image],
            floors: Number(data.get("floors")) || 0,
            occupancy: Number(data.get("occupancy")) || 0,
            averageRent: clean(data.get("averageRent")),
            investmentHighlight: clean(data.get("investmentHighlight")),
            description: clean(data.get("description")),
          };
          const index = fullState.buildings.findIndex((building) => building.id === id);
          if (index >= 0) fullState.buildings[index] = payload;
          else fullState.buildings.push(payload);
          fullState.rooms = (fullState.rooms || []).map((room) =>
            room.buildingId === id ? extend(room, { region: payload.region }) : room
          );
          await saveState(fullState);
          await reloadBootstrap();
          resetBuildingForm(false);
          await refreshRooms();
          showNotice(index >= 0 ? "Đã cập nhật tòa nhà." : "Đã thêm tòa nhà mới.", "success");
        } catch (error) {
          showNotice(error.message || "Không thể lưu tòa nhà.", "error");
        }
      });

      roomForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Đang lưu dữ liệu...", "info");
          const data = new FormData(roomForm);
          const id = clean(data.get("id"));
          const existing = currentRoomItems.find((room) => room.id === id) || null;
          const roomUploads = await uploadFiles(roomForm.elements.namedItem("imageFile").files);
          const payload = {
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
          if (id) {
            await updateRoom(id, payload);
          } else {
            await createRoom(payload);
          }
          await reloadBootstrap();
          resetRoomForm(false);
          await refreshRooms();
          showNotice(id ? "Đã cập nhật phòng." : "Đã thêm phòng mới.", "success");
        } catch (error) {
          showNotice(error.message || "Không thể lưu phòng.", "error");
        }
      });

      newsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const data = new FormData(newsForm);
          const id = clean(data.get("id")) || createId("news");
          const existing = state.news.find((item) => item.id === id);
          const imageUploads = await uploadFiles(newsForm.elements.namedItem("imageFile").files);
          const payload = {
            id,
            title: clean(data.get("title")),
            category: clean(data.get("category")),
            status: clean(data.get("status")),
            publishedAt: clean(data.get("publishedAt")),
            image: firstNonEmpty(imageUploads[0], data.get("image"), existing && existing.image, FALLBACK_BUILDING_IMAGE),
            excerpt: clean(data.get("excerpt")),
            body: clean(data.get("body")),
          };
          const index = state.news.findIndex((item) => item.id === id);
          if (index >= 0) state.news[index] = payload;
          else state.news.unshift(payload);
          clearFileInputs(newsForm);
          resetNewsForm(false);
          await persistMutation((fullState) => {
            fullState.news = state.news;
          }, index >= 0 ? "Đã cập nhật bài viết." : "Đã đăng bài viết mới.");
        } catch (error) {
          showNotice(error.message || "Không thể lưu bài viết.", "error");
        }
      });

      adminAccountForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const data = new FormData(adminAccountForm);
          const id = clean(data.get("id")) || createId("admin");
          const payload = {
            id,
            name: clean(data.get("name")),
            email: clean(data.get("email")).toLowerCase(),
            password: clean(data.get("password")),
            role: clean(data.get("role")) || "admin",
          };
          if (state.admins.some((admin) => admin.email === payload.email && admin.id !== id)) {
            throw new Error("Email admin đã tồn tại.");
          }
          const index = state.admins.findIndex((admin) => admin.id === id);
          if (index >= 0) state.admins[index] = payload;
          else state.admins.push(payload);
          resetAdminAccountForm(false);
          await persistMutation((fullState) => {
            fullState.admins = state.admins;
            fullState.admin = {
              email: state.admins[0].email,
              password: state.admins[0].password,
            };
          }, index >= 0 ? "Đã cập nhật tài khoản admin." : "Đã thêm tài khoản admin.");
        } catch (error) {
          showNotice(error.message || "Không thể lưu tài khoản admin.", "error");
        }
      });

      customerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Đang lưu dữ liệu...", "info");
          const data = new FormData(customerForm);
          const id = clean(data.get("id"));
          const payload = {
            name: clean(data.get("name")),
            phone: clean(data.get("phone")),
            platform: clean(data.get("platform")),
            region: clean(data.get("region")),
            status: clean(data.get("status")),
            demand: clean(data.get("demand")),
            note: clean(data.get("note")),
            closedUnits: Number(data.get("closedUnits")) || 0,
          };
          if (id) {
            await updateCustomer(id, payload);
          } else {
            await createCustomer(payload);
          }
          await reloadBootstrap();
          resetCustomerForm(false);
          await refreshCustomers();
          showNotice(id ? "Đã cập nhật khách hàng." : "Đã thêm khách hàng mới.", "success");
        } catch (error) {
          showNotice(error.message || "Không thể lưu khách hàng.", "error");
        }
      });

      renderStatic();
      await refreshRooms();
      await refreshCustomers();

      function handleRoomFilterChange() {
        roomPaging.page = 1;
        refreshRooms();
      }

      function handleCustomerFilterChange() {
        customerPaging.page = 1;
        refreshCustomers();
      }

      async function persistMutation(mutateFullState, message) {
        showNotice("Đang lưu dữ liệu...", "info");
        const fullState = normalizeState(await loadState());
        mutateFullState(fullState);
        await saveState(fullState);
        await reloadBootstrap();
        showNotice(message, "success");
      }

      async function reloadBootstrap() {
        state = normalizeState(await loadAdminBootstrap());
        renderStatic();
      }

      async function refreshRooms() {
        try {
          adminRoomGrid.innerHTML = '<div class="empty-state-card">Đang tải danh sách phòng...</div>';
          const response = await loadRoomsPage({
            page: roomPaging.page,
            limit: ROOM_PAGE_LIMIT,
            search: roomSearch.value.trim(),
            status: roomStatusFilter.value,
            buildingId: roomBuildingFilter.value,
          });
          currentRoomItems = response.items || [];
          roomPaging.page = response.page || 1;
          roomPaging.totalPages = response.totalPages || 1;
          roomPaging.totalItems = response.totalItems || 0;
          renderRoomCards();
        } catch (error) {
          adminRoomGrid.innerHTML = `<div class="empty-state-card">${error.message || "Không thể tải danh sách phòng."}</div>`;
          adminRoomsPagination.textContent = "Lỗi tải dữ liệu";
          adminRoomsPrevButton.disabled = true;
          adminRoomsNextButton.disabled = true;
        }
      }

      function renderStatic() {
        document.getElementById("adminCompanyName").textContent = state.company.name;
        applyBrand(state.company, state.content);
        fillContentForm();
        fillCompanyForm();
        fillStatsForm();
        fillRoomBuildingOptions();
        fillRoomBuildingFilter();
        fillCustomerOptionInputs();
        fillCustomerFilterOptions();
        renderCustomerStats();
        if (currentRole === "admin") {
          renderBuildingTable();
          renderNewsCards();
          renderAdminAccounts();
        }
        if (!newsForm.elements.namedItem("publishedAt").value) {
          newsForm.elements.namedItem("publishedAt").value = new Date().toISOString().slice(0, 10);
        }
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
          const labelField = statsForm.elements.namedItem(`statLabel${idx}`);
          const valueField = statsForm.elements.namedItem(`statValue${idx}`);
          const noteField = statsForm.elements.namedItem(`statNote${idx}`);
          if (labelField) labelField.value = stat.label || "";
          if (valueField) valueField.value = stat.value || "";
          if (noteField) noteField.value = stat.note || "";
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

      function fillRoomBuildingFilter() {
        const currentValue = roomBuildingFilter.value;
        roomBuildingFilter.innerHTML = '<option value="">Tất cả tòa nhà</option>' +
          state.buildings.map((building) => `<option value="${building.id}">${building.name}</option>`).join("");
        if (state.buildings.some((building) => building.id === currentValue)) {
          roomBuildingFilter.value = currentValue;
        }
      }

      function fillCustomerOptionInputs() {
        const config = state.customerConfig || { platforms: [], regions: [], statuses: [] };
        fillSelectWithPlaceholder(customerPlatformInput, config.platforms, "Chọn nền tảng");
        fillSelectWithPlaceholder(customerRegionInput, config.regions, "Chọn khu vực");
        fillSelectWithPlaceholder(customerStatusInput, config.statuses, "Chọn tình trạng");
        if (!customerStatusInput.value && config.statuses[0]) {
          customerStatusInput.value = config.statuses[0];
        }
      }

      function fillCustomerFilterOptions() {
        const config = state.customerConfig || { platforms: [], regions: [], statuses: [] };
        fillSelectWithPlaceholder(customerPlatformFilter, config.platforms, "Tất cả nền tảng", true);
        fillSelectWithPlaceholder(customerRegionFilter, config.regions, "Tất cả khu vực", true);
        fillSelectWithPlaceholder(customerStatusFilter, config.statuses, "Tất cả tình trạng", true);
      }

      function renderCustomerStats() {
        const stats = (state.meta && state.meta.customerStats) || {
          totalCustomers: 0,
          totalClosedCustomers: 0,
          totalClosedUnits: 0,
          byAdmin: [],
        };
        const cards = [
          { label: "Tổng khách hàng", value: stats.totalCustomers, note: "Data đang được quản lý trong hệ thống" },
          { label: "Khách đã chốt", value: stats.totalClosedCustomers, note: "Số khách có trạng thái đã chốt" },
          { label: "Tổng số căn chốt", value: stats.totalClosedUnits, note: "Tổng số căn đã ghi nhận thành công" },
          { label: "Admin hoạt động", value: stats.byAdmin.length, note: "Số tài khoản đã nhập data khách hàng" },
        ];
        customerStatsGrid.innerHTML = cards.map((item) => `
          <article class="admin-stat-card">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <p class="muted-copy">${item.note}</p>
          </article>
        `).join("");

        if (stats.byAdmin.length) {
          customerStatsGrid.innerHTML += stats.byAdmin.map((item) => `
            <article class="admin-stat-card">
              <span>${item.adminName}</span>
              <strong>${item.totalCustomers}</strong>
              <p class="muted-copy">Đã tiếp cận ${item.totalCustomers} khách, chốt ${item.closedCustomers} khách / ${item.closedUnits} căn</p>
            </article>
          `).join("");
        }
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
          const roomCount = Number((state.meta.roomCountsByBuilding || {})[building.id] || 0);
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
              return;
            }

            const confirmed = window.confirm(`Xóa tòa nhà "${building.name}" và toàn bộ phòng thuộc tòa nhà này?`);
            if (!confirmed) return;
            try {
              showNotice("Đang lưu dữ liệu...", "info");
              const fullState = normalizeState(await loadState());
              fullState.buildings = fullState.buildings.filter((item) => item.id !== building.id);
              fullState.rooms = (fullState.rooms || []).filter((room) => room.buildingId !== building.id);
              await saveState(fullState);
              await reloadBootstrap();
              if (roomBuildingFilter.value === building.id) {
                roomBuildingFilter.value = "";
              }
              await refreshRooms();
              showNotice("Đã xóa tòa nhà và các phòng liên quan.", "success");
            } catch (error) {
              showNotice(error.message || "Không thể xóa tòa nhà.", "error");
            }
          });
        });
      }

      function renderRoomCards() {
        if (!currentRoomItems.length) {
          adminRoomGrid.innerHTML = '<div class="empty-state-card">Không có phòng phù hợp.</div>';
          adminRoomsPagination.textContent = roomPaging.totalItems ? `Trang ${roomPaging.page} / ${roomPaging.totalPages}` : "0 phòng";
          adminRoomsPrevButton.disabled = true;
          adminRoomsNextButton.disabled = true;
          return;
        }

        adminRoomGrid.innerHTML = "";
        currentRoomItems.forEach((room) => {
          const card = document.createElement("article");
          card.className = "room-card";
          card.innerHTML = `
            <div class="room-visual">
              <img src="${safeImage(room.image, FALLBACK_ROOM_IMAGE)}" alt="${room.name}">
            </div>
            <span class="status-pill status-${room.status}">${statusLabel(room.status)}</span>
            <h3>${room.name}</h3>
            <p>${room.buildingName || "Không xác định"} | ${room.type}</p>
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
            const action = button.dataset.roomAction;
            const current = currentRoomItems.find((item) => item.id === button.dataset.id);
            const room = current || (await loadRoomById(button.dataset.id)).item;
            if (!room) return;

            if (action === "edit") {
              eachEntry(room, (key, value) => {
                const field = roomForm.elements.namedItem(key);
                if (field) field.value = value || "";
              });
              activateTab("rooms");
              scrollToForm(roomForm, "name");
              showNotice(`Đang chỉnh sửa phòng ${room.name}.`, "info");
              return;
            }

            const confirmed = window.confirm(`Xóa phòng "${room.name}"?`);
            if (!confirmed) return;
            try {
              showNotice("Đang lưu dữ liệu...", "info");
              await deleteRoom(room.id);
              await reloadBootstrap();
              if (roomPaging.page > 1 && currentRoomItems.length === 1) {
                roomPaging.page -= 1;
              }
              await refreshRooms();
              showNotice("Đã xóa phòng.", "success");
            } catch (error) {
              showNotice(error.message || "Không thể xóa phòng.", "error");
            }
          });
        });

        adminRoomsPagination.textContent = `Trang ${roomPaging.page} / ${roomPaging.totalPages} • ${roomPaging.totalItems} phòng`;
        adminRoomsPrevButton.disabled = roomPaging.page <= 1;
        adminRoomsNextButton.disabled = roomPaging.page >= roomPaging.totalPages;
      }

      async function refreshCustomers() {
        try {
          customerTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">Đang tải dữ liệu khách hàng...</div></td></tr>';
          const response = await loadCustomersPage({
            page: customerPaging.page,
            limit: 12,
            search: customerSearch.value.trim(),
            status: customerStatusFilter.value,
            platform: customerPlatformFilter.value,
            region: customerRegionFilter.value,
          });
          currentCustomerItems = response.items || [];
          customerPaging.page = response.page || 1;
          customerPaging.totalPages = response.totalPages || 1;
          customerPaging.totalItems = response.totalItems || 0;
          state.meta.customerStats = response.stats || state.meta.customerStats;
          state.customerConfig = {
            platforms: response.filters?.platforms || [],
            regions: response.filters?.regions || [],
            statuses: response.filters?.statuses || [],
          };
          fillCustomerOptionInputs();
          fillCustomerFilterOptions();
          renderCustomerStats();
          renderCustomerTable();
        } catch (error) {
          customerTableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state-inline">${error.message || "Không thể tải data khách hàng."}</div></td></tr>`;
          customersPagination.textContent = "Lỗi tải dữ liệu";
          customersPrevButton.disabled = true;
          customersNextButton.disabled = true;
        }
      }

      function renderCustomerTable() {
        if (!currentCustomerItems.length) {
          customerTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">Không có khách hàng phù hợp.</div></td></tr>';
          customersPagination.textContent = customerPaging.totalItems ? `Trang ${customerPaging.page} / ${customerPaging.totalPages}` : "0 khách hàng";
          customersPrevButton.disabled = true;
          customersNextButton.disabled = true;
          return;
        }

        customerTableBody.innerHTML = "";
        currentCustomerItems.forEach((customer) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${customer.name}</strong><br><span>${customer.phone}</span><br><small>${customer.demand}</small></td>
            <td>${customer.platform}</td>
            <td>${customer.region}</td>
            <td>${customer.status}${Number(customer.closedUnits || 0) ? `<br><small>${customer.closedUnits} căn</small>` : ""}</td>
            <td>${customer.createdByName || "Admin"}<br><small>${customer.createdByEmail || ""}</small></td>
            <td>
              <div class="action-group">
                <button type="button" data-customer-action="edit" data-id="${customer.id}">Sửa</button>
                <button type="button" class="danger" data-customer-action="delete" data-id="${customer.id}">Xóa</button>
              </div>
            </td>
          `;
          customerTableBody.appendChild(row);
        });

        customerTableBody.querySelectorAll("[data-customer-action]").forEach((button) => {
          button.addEventListener("click", async () => {
            const action = button.dataset.customerAction;
            const current = currentCustomerItems.find((item) => item.id === button.dataset.id);
            const customer = current || (await loadCustomerById(button.dataset.id)).item;
            if (!customer) return;

            if (action === "edit") {
              eachEntry(customer, (key, value) => {
                const field = customerForm.elements.namedItem(key);
                if (field) field.value = value ?? "";
              });
              activateTab("customers");
              scrollToForm(customerForm, "name");
              showNotice(`Đang chỉnh sửa khách hàng ${customer.name}.`, "info");
              return;
            }

            const confirmed = window.confirm(`Xóa khách hàng "${customer.name}"?`);
            if (!confirmed) return;
            try {
              showNotice("Đang lưu dữ liệu...", "info");
              await deleteCustomer(customer.id);
              await reloadBootstrap();
              if (customerPaging.page > 1 && currentCustomerItems.length === 1) {
                customerPaging.page -= 1;
              }
              await refreshCustomers();
              showNotice("Đã xóa khách hàng.", "success");
            } catch (error) {
              showNotice(error.message || "Không thể xóa khách hàng.", "error");
            }
          });
        });

        customersPagination.textContent = `Trang ${customerPaging.page} / ${customerPaging.totalPages} • ${customerPaging.totalItems} khách`;
        customersPrevButton.disabled = customerPaging.page <= 1;
        customersNextButton.disabled = customerPaging.page >= customerPaging.totalPages;
      }

      function addCustomerOption(type) {
        const label = type === "platform" ? "nền tảng" : "khu vực";
        const value = window.prompt(`Nhập ${label} mới`);
        const normalized = clean(value);
        if (!normalized) return;
        const key = type === "platform" ? "platforms" : "regions";
        state.customerConfig[key] = unique([...state.customerConfig[key], normalized]);
        fillCustomerOptionInputs();
        fillCustomerFilterOptions();
        if (type === "platform") customerPlatformInput.value = normalized;
        if (type === "region") customerRegionInput.value = normalized;
      }

      function renderNewsCards() {
        const keyword = newsSearch.value.trim().toLowerCase();
        const category = newsCategoryFilter.value;
        const items = state.news.filter((item) => {
          const matchesKeyword = [item.title, item.category, item.excerpt].join(" ").toLowerCase().includes(keyword);
          const matchesCategory = !category || item.category === category;
          return matchesKeyword && matchesCategory;
        });
        if (!items.length) {
          adminNewsGrid.innerHTML = '<div class="empty-state-card">Không có bài viết phù hợp.</div>';
          return;
        }

        adminNewsGrid.innerHTML = "";
        items.forEach((item) => {
          const card = document.createElement("article");
          card.className = "news-card";
          card.innerHTML = `
            <div class="news-card-image">
              <img src="${safeImage(item.image, FALLBACK_BUILDING_IMAGE)}" alt="${item.title}">
            </div>
            <div class="news-card-copy">
              <div class="news-card-tags">
                <span class="news-badge">${item.category}</span>
                <span class="status-pill ${item.status === "draft" ? "status-upcoming" : "status-available"}">${item.status === "draft" ? "Nháp" : "Đã đăng"}</span>
              </div>
              <h3>${item.title}</h3>
              <p class="news-card-date">${formatDate(item.publishedAt)}</p>
              <p>${item.excerpt}</p>
              <div class="room-actions">
                <button type="button" data-news-action="edit" data-id="${item.id}">Sửa</button>
                <button type="button" class="danger" data-news-action="delete" data-id="${item.id}">Xóa</button>
              </div>
            </div>
          `;
          adminNewsGrid.appendChild(card);
        });

        adminNewsGrid.querySelectorAll("[data-news-action]").forEach((button) => {
          button.addEventListener("click", async () => {
            const item = state.news.find((entry) => entry.id === button.dataset.id);
            if (!item) return;

            if (button.dataset.newsAction === "edit") {
              eachEntry(item, (key, value) => {
                const field = newsForm.elements.namedItem(key);
                if (field) field.value = value || "";
              });
              activateTab("news");
              scrollToForm(newsForm, "title");
              showNotice(`Đang chỉnh sửa bài viết ${item.title}.`, "info");
              return;
            }

            const confirmed = window.confirm(`Xóa bài viết "${item.title}"?`);
            if (!confirmed) return;
            state.news = state.news.filter((entry) => entry.id !== item.id);
            await persistMutation((fullState) => {
              fullState.news = state.news;
            }, "Đã xóa bài viết.");
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
            <td>${admin.role === "manager" ? "Quản lý" : "Admin"}</td>
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
              adminAccountForm.elements.role.value = admin.role || "admin";
              activateTab("admins");
              scrollToForm(adminAccountForm, "name");
              showNotice(`Đang chỉnh sửa tài khoản ${admin.email}.`, "info");
              return;
            }

            if (state.admins.length <= 1) {
              showNotice("Phải giữ lại ít nhất một tài khoản admin.", "error");
              return;
            }
            const confirmed = window.confirm(`Xóa tài khoản admin "${admin.email}"?`);
            if (!confirmed) return;
            state.admins = state.admins.filter((item) => item.id !== admin.id);
            await persistMutation((fullState) => {
              fullState.admins = state.admins;
              fullState.admin = {
                email: state.admins[0].email,
                password: state.admins[0].password,
              };
            }, "Đã xóa tài khoản admin.");
          });
        });
      }

      function resetBuildingForm(showMessage) {
        buildingForm.reset();
        buildingForm.elements.id.value = "";
        clearFileInputs(buildingForm);
        if (showMessage) showNotice("Đã làm mới form tòa nhà.", "info");
      }

      function resetRoomForm(showMessage) {
        roomForm.reset();
        roomForm.elements.id.value = "";
        clearFileInputs(roomForm);
        fillRoomBuildingOptions();
        if (showMessage) showNotice("Đã làm mới form phòng.", "info");
      }

      function resetNewsForm(showMessage) {
        newsForm.reset();
        newsForm.elements.id.value = "";
        clearFileInputs(newsForm);
        newsForm.elements.publishedAt.value = new Date().toISOString().slice(0, 10);
        newsForm.elements.status.value = "published";
        if (showMessage) showNotice("Đã làm mới form bài viết.", "info");
      }

      function resetCustomerForm(showMessage) {
        customerForm.reset();
        customerForm.elements.id.value = "";
        customerForm.elements.closedUnits.value = "0";
        fillCustomerOptionInputs();
        if (showMessage) showNotice("Đã làm mới form khách hàng.", "info");
      }

      function resetAdminAccountForm(showMessage) {
        adminAccountForm.reset();
        adminAccountForm.elements.id.value = "";
        if (adminAccountForm.elements.role) adminAccountForm.elements.role.value = "admin";
        if (showMessage) showNotice("Đã làm mới form tài khoản admin.", "info");
      }

      function showNotice(message, tone) {
        notice.textContent = message;
        notice.className = `admin-notice admin-notice-${tone}`;
      }
    } finally {
      document.body.classList.remove("app-loading");
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

  function applyAccessControl(role) {
    const normalizedRole = String(role || "admin").toLowerCase();
    document.querySelectorAll("[data-role]").forEach((element) => {
      const allowed = String(element.dataset.role || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      const visible = !allowed.length || allowed.includes(normalizedRole);
      element.classList.toggle("hidden", !visible);
      if (element.classList.contains("admin-panel")) {
        element.classList.toggle("active", visible && element.dataset.panel === (normalizedRole === "manager" ? "customers" : "intro"));
      }
      if (element.classList.contains("admin-tab")) {
        element.classList.toggle("active", visible && element.dataset.tab === (normalizedRole === "manager" ? "customers" : "intro"));
      }
    });
  }

  function normalizeState(state) {
    const nextState = Object.assign({}, state);
    nextState.content = Object.assign({
      navNews: "Tin tức",
      newsPageKicker: "Tin tức",
      newsPageTitle: "Bài viết, tuyển dụng và thông báo mới",
      newsPageDescription: "Theo dõi cập nhật hoạt động, bài viết thị trường, chương trình tuyển dụng và các thông báo mới từ Bhome.",
      newsSectionKicker: "Tin tức",
      newsSectionTitle: "Cập nhật mới nhất từ Bhome",
      newsSectionButton: "Xem tất cả bài viết",
      announcementEnabled: "true",
      announcementText: "Chào mừng bạn đến với Bhome. Danh mục căn hộ đang được cập nhật liên tục.",
    }, nextState.content || {});
    nextState.company = Object.assign({}, nextState.company || {});
    nextState.investorStats = Array.isArray(nextState.investorStats) ? nextState.investorStats : [];
    nextState.results = Array.isArray(nextState.results) ? nextState.results : [];
    nextState.buildings = Array.isArray(nextState.buildings) ? nextState.buildings : [];
    nextState.rooms = Array.isArray(nextState.rooms) ? nextState.rooms : [];
    nextState.news = Array.isArray(nextState.news) ? nextState.news : [];
    nextState.customers = Array.isArray(nextState.customers) ? nextState.customers : [];
    nextState.customerConfig = Object.assign({
      platforms: ["Facebook", "Zalo", "Website", "TikTok"],
      regions: ["Nha Trang", "Cam Ranh", "Diên Khánh"],
      statuses: ["Mới", "Đang tư vấn", "Đã xem phòng", "Đã chốt", "Chưa phù hợp"],
    }, nextState.customerConfig || {});
    nextState.meta = Object.assign({
      roomCountsByBuilding: {},
      totalRooms: 0,
      customerStats: { totalCustomers: 0, totalClosedCustomers: 0, totalClosedUnits: 0, byAdmin: [] },
      customerConfig: nextState.customerConfig,
      session: { adminEmail: "" },
    }, nextState.meta || {});
    nextState.news = nextState.news.map((item) => Object.assign({
      status: "published",
      category: "Tin tức",
      excerpt: "",
      body: "",
      image: FALLBACK_BUILDING_IMAGE,
      publishedAt: new Date().toISOString().slice(0, 10),
    }, item));
    const defaultAdmin = nextState.admin || { email: "admin@nova.vn", password: "123456" };
    nextState.admins = Array.isArray(nextState.admins) && nextState.admins.length
      ? nextState.admins
      : [{
          id: "admin-root",
          name: "Admin chính",
          email: defaultAdmin.email,
          password: defaultAdmin.password,
          role: "admin",
        }];
    nextState.admins = nextState.admins.map((admin) => Object.assign({ role: "admin" }, admin));
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
    Object.keys(object || {}).forEach((key) => fn(key, object[key]));
  }

  function unique(items) {
    return Array.from(new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean)));
  }

  function fillSelectWithPlaceholder(select, values, placeholder, allowEmptyValue) {
    const currentValue = select.value;
    const options = allowEmptyValue ? [`<option value="">${placeholder}</option>`] : [];
    const uniqueValues = unique(values);
    select.innerHTML = options.concat(
      uniqueValues.map((value) => `<option value="${value}">${value}</option>`)
    ).join("");
    if (uniqueValues.includes(currentValue)) {
      select.value = currentValue;
    } else if (!allowEmptyValue && uniqueValues[0]) {
      select.value = uniqueValues[0];
    } else if (allowEmptyValue) {
      select.value = "";
    }
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
    if (brandEyebrow) brandEyebrow.textContent = content.brandEyebrow || "";
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

  function createId(prefix) {
    return `${prefix || "id"}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
})();
