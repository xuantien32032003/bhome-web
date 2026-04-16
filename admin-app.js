(function () {
  const {
    createCustomer,
    createRoom,
    deleteCustomer,
    deleteRoom,
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    downloadAdminBackup,
    formatDate,
    formatDateTime,
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
    updateRoomOccupancy,
    uploadFiles,
  } = window.NovaData;

  const page = document.body.dataset.page;
  const ROOM_PAGE_LIMIT = 12;

  const TEXT_FIXES = [
    ["ÄÄƒng nháº­p", "Đăng nhập"],
    ["ÄÄƒng xuáº¥t", "Đăng xuất"],
    ["Äang Ä‘Äƒng nháº­p...", "Đang đăng nhập..."],
    ["Quáº£n lÃ½", "Quản lý"],
    ["KhÃ¡ch hÃ ng", "Khách hàng"],
    ["TÃ²a nhÃ ", "Tòa nhà"],
    ["PhÃ²ng", "Phòng"],
    ["Káº¿t quáº£", "Kết quả"],
    ["Tin tá»©c", "Tin tức"],
    ["Ná»™i dung", "Nội dung"],
    ["Tá»•ng quan", "Tổng quan"],
    ["Táº¥t cáº£", "Tất cả"],
    ["Táº¡o má»›i", "Tạo mới"],
    ["Táº£i", "Tải"],
    ["TÃ¬m", "Tìm"],
    ["TiÃªu Ä‘á»", "Tiêu đề"],
    ["MÃ´ táº£", "Mô tả"],
    ["LiÃªn há»‡", "Liên hệ"],
    ["LÆ°u", "Lưu"],
    ["Sá»‘", "Số"],
    ["Thá»i gian", "Thời gian"],
    ["Ghi chÃº", "Ghi chú"],
    ["Nhu cáº§u", "Nhu cầu"],
    ["Tá»· lá»‡", "Tỷ lệ"],
    ["ÄÃ£ chá»‘t", "Đã chốt"],
    ["ChÆ°a chá»‘t", "Chưa chốt"],
    ["ÄÃ£ cÃ³ khÃ¡ch", "Đã có khách"],
    ["Äang trá»‘ng", "Đang trống"],
    ["Sáº¯p trá»‘ng", "Sắp trống"],
    ["ÄÃ£ xem phÃ²ng", "Đã xem phòng"],
    ["Äang tÆ° váº¥n", "Đang tư vấn"],
    ["ChÆ°a phÃ¹ há»£p", "Chưa phù hợp"],
    ["Má»›i", "Mới"],
    ["Khu vá»±c", "Khu vực"],
    ["Äá»‹a chá»‰", "Địa chỉ"],
    ["GiÃ¡ thuÃª", "Giá thuê"],
    ["NgÃ y trá»‘ng", "Ngày trống"],
    ["Diá»‡n tÃ­ch", "Diện tích"],
    ["Tiá»‡n Ã­ch", "Tiện ích"],
    ["LÄ©nh vá»±c", "Lĩnh vực"],
    ["CÃ´ng ty", "Công ty"],
    ["Trang chá»§", "Trang chủ"],
    ["Trang trÆ°á»›c", "Trang trước"],
    ["Lá»—i táº£i dá»¯ liá»‡u", "Lỗi tải dữ liệu"],
    ["KhÃ´ng thá»ƒ", "Không thể"],
    ["KhÃ´ng cÃ³", "Không có"],
    ["KhÃ´ng xÃ¡c Ä‘á»‹nh", "Không xác định"],
    ["Cáº­p nháº­t", "Cập nhật"],
    ["Sá»­a", "Sửa"],
    ["XÃ³a", "Xóa"],
    ["Thao tÃ¡c", "Thao tác"],
    ["Vai trÃ²", "Vai trò"],
    ["Email Ä‘Äƒng nháº­p", "Email đăng nhập"],
    ["Máº­t kháº©u", "Mật khẩu"],
    ["Khu quáº£n trá»‹ riÃªng", "Khu quản trị riêng"],
    ["Khu vá»±c quáº£n trá»‹", "Khu vực quản trị"],
    ["Báº£ng Ä‘iá»u khiá»ƒn quáº£n trá»‹", "Bảng điều khiển quản trị"],
    ["Ná»n táº£ng Ä‘áº§u tÆ° cÄƒn há»™", "Nền tảng đầu tư căn hộ"],
    ["Logo cÃ´ng ty", "Logo công ty"],
    ["TÃ i khoáº£n admin", "Tài khoản admin"],
    ["Admin chÃ­nh", "Admin chính"],
    ["DiÃªn KhÃ¡nh", "Diên Khánh"],
    ["TÃªn", "Tên"],
    ["TÃªn cÃ´ng ty", "Tên công ty"],
    ["TÃªn tÃ²a nhÃ ", "Tên tòa nhà"],
    ["TÃªn phÃ²ng", "Tên phòng"],
    ["TÃªn khÃ¡ch", "Tên khách"],
    ["Sá»‘ Ä‘iá»‡n thoáº¡i", "Số điện thoại"],
    ["áº¢nh", "Ảnh"],
    ["Láº¥p Ä‘áº§y", "Lấp đầy"],
    ["Sá»‘ táº§ng", "Số tầng"],
    ["GiÃ¡ trung bÃ¬nh", "Giá trung bình"],
    ["Äiá»ƒm nháº¥n", "Điểm nhấn"],
    ["ThÃ´ng tin", "Thông tin"],
    ["NÃºt", "Nút"],
    ["Báº­t", "Bật"],
    ["Táº¯t", "Tắt"],
    ["Hiá»ƒn thá»‹", "Hiển thị"],
    ["chá»‰nh", "chỉnh"],
    ["Ä‘áº¿n", "đến"],
    ["vá»", "về"],
    ["váº­n hÃ nh", "vận hành"],
    ["thÆ°Æ¡ng hiá»‡u", "thương hiệu"],
    ["hoáº·c", "hoặc"],
    ["Ä‘Æ°á»ng dáº«n", "đường dẫn"],
    ["quáº£n trá»‹", "quản trị"],
    ["dá»¯ liá»‡u", "dữ liệu"],
  ];

  function cleanText(value) {
    let text = String(value ?? "");
    for (const [from, to] of TEXT_FIXES) {
      if (text.includes(from)) text = text.split(from).join(to);
    }
    return text;
  }

  function repairDomText(root) {
    if (!root) return;
    document.title = cleanText(document.title);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const fixed = cleanText(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
      node = walker.nextNode();
    }
    root.querySelectorAll("*").forEach((element) => {
      ["placeholder", "title", "alt", "aria-label"].forEach((attr) => {
        if (element.hasAttribute && element.hasAttribute(attr)) {
          const fixed = cleanText(element.getAttribute(attr));
          if (fixed !== element.getAttribute(attr)) element.setAttribute(attr, fixed);
        }
      });
    });
  }

  let domRepairObserverAttached = false;
  function attachDomRepairObserver() {
    if (domRepairObserverAttached) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
            repairDomText(node.parentElement);
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            repairDomText(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    domRepairObserverAttached = true;
  }

  if (page === "admin-login") initLoginPage();
  if (page === "admin-dashboard") initDashboard();

  async function initLoginPage() {
    try {
      const state = await loadState();
      applyManagedText(state.content || {});
      applyBrand(state.company || {}, state.content || {});
      attachDomRepairObserver();
      repairDomText(document.body);

      if (await isAdminLoggedIn()) {
        window.location.href = "admin-dashboard.html";
        return;
      }

      const form = document.getElementById("adminLoginForm");
      const hint = document.getElementById("loginHint");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hint.textContent = cleanText("Äang Ä‘Äƒng nháº­p...");

        try {
          const data = new FormData(form);
          await loginAdmin(data.get("email"), data.get("password"));
          window.location.href = "admin-dashboard.html";
        } catch (error) {
          hint.textContent = cleanText(error.message || "Sai email hoáº·c máº­t kháº©u.");
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
      let activeMainTab = "info";
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
      const roomOccupancyForm = document.getElementById("roomOccupancyForm");
      const adminAccountForm = document.getElementById("adminAccountForm");
      const backupButton = document.getElementById("backupButton");
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
      const customerPageSize = document.getElementById("customerPageSize");
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
      const roomOccupancyRoomId = document.getElementById("roomOccupancyRoomId");
      const adminSearch = document.getElementById("adminSearch");
      const currentRole = ((state.meta && state.meta.session && state.meta.session.adminRole) || "admin").toLowerCase();
      const currentAdminName = (state.meta && state.meta.session && state.meta.session.adminName) || "";

      setupTabs();
      setupMainTabs(currentRole);
      applyAccessControl(currentRole);
      attachDomRepairObserver();
      if (adminRoleBadge) {
        adminRoleBadge.textContent = cleanText(currentRole === "manager" ? `Quáº£n lÃ½${currentAdminName ? ` â€¢ ${currentAdminName}` : ""}` : `Admin${currentAdminName ? ` â€¢ ${currentAdminName}` : ""}`);
      }

      document.getElementById("logoutButton").addEventListener("click", async () => {
        await logoutAdmin();
        window.location.href = "admin-login.html";
      });
      if (backupButton) {
        backupButton.addEventListener("click", () => downloadAdminBackup());
      }
      document.getElementById("buildingResetButton").addEventListener("click", () => resetBuildingForm(true));
      document.getElementById("roomResetButton").addEventListener("click", () => resetRoomForm(true));
      document.getElementById("newsResetButton").addEventListener("click", () => resetNewsForm(true));
      document.getElementById("customerResetButton").addEventListener("click", () => resetCustomerForm(true));
      document.getElementById("roomOccupancyResetButton").addEventListener("click", () => resetRoomOccupancyForm(true));
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
      [customerSearch, customerPageSize, customerPlatformFilter, customerRegionFilter, customerStatusFilter].forEach((element) => {
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
      roomOccupancyRoomId.addEventListener("change", async () => {
        try {
          const response = await loadRoomById(roomOccupancyRoomId.value);
          syncRoomOccupancyForm(response.item);
        } catch (_error) {
          resetRoomOccupancyForm(false);
        }
      });

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
          }, "ÄÃ£ lÆ°u ná»™i dung website.");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u ná»™i dung website.", "error");
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
          }, "ÄÃ£ lÆ°u thÃ´ng tin cÃ´ng ty.");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u thÃ´ng tin cÃ´ng ty.", "error");
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
          }, "ÄÃ£ lÆ°u cÃ¡c chá»‰ sá»‘ vÃ  ná»™i dung káº¿t quáº£.");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u chá»‰ sá»‘.", "error");
        }
      });

      buildingForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
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
          showNotice(index >= 0 ? "ÄÃ£ cáº­p nháº­t tÃ²a nhÃ ." : "ÄÃ£ thÃªm tÃ²a nhÃ  má»›i.", "success");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u tÃ²a nhÃ .", "error");
        }
      });

      roomForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
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
          showNotice(id ? "ÄÃ£ cáº­p nháº­t phÃ²ng." : "ÄÃ£ thÃªm phÃ²ng má»›i.", "success");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u phÃ²ng.", "error");
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
          }, index >= 0 ? "ÄÃ£ cáº­p nháº­t bÃ i viáº¿t." : "ÄÃ£ Ä‘Äƒng bÃ i viáº¿t má»›i.");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u bÃ i viáº¿t.", "error");
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
          if (!clean(data.get("id")) && !payload.password) {
            throw new Error("TÃ i khoáº£n má»›i pháº£i cÃ³ máº­t kháº©u.");
          }
          if (state.admins.some((admin) => admin.email === payload.email && admin.id !== id)) {
            throw new Error("Email admin Ä‘Ã£ tá»“n táº¡i.");
          }
          const index = state.admins.findIndex((admin) => admin.id === id);
          if (index >= 0) state.admins[index] = Object.assign({}, state.admins[index], payload);
          else state.admins.push(payload);
          resetAdminAccountForm(false);
          await persistMutation((fullState) => {
            fullState.admins = state.admins;
            fullState.admin = {
              email: state.admins[0].email,
              password: state.admins[0].password,
            };
          }, index >= 0 ? "ÄÃ£ cáº­p nháº­t tÃ i khoáº£n admin." : "ÄÃ£ thÃªm tÃ i khoáº£n admin.");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u tÃ i khoáº£n admin.", "error");
        }
      });

      customerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
          const data = new FormData(customerForm);
          const id = clean(data.get("id"));
          const payload = {
            name: clean(data.get("name")),
            phone: clean(data.get("phone")),
            platform: clean(data.get("platform")),
            region: clean(data.get("region")),
            status: clean(data.get("status")),
            closeStatus: clean(data.get("closeStatus")) || "open",
            demand: clean(data.get("demand")),
            note: clean(data.get("note")),
          };
          if (id) {
            await updateCustomer(id, payload);
          } else {
            await createCustomer(payload);
          }
          await reloadBootstrap();
          resetCustomerForm(false);
          await refreshCustomers();
          showNotice(id ? "ÄÃ£ cáº­p nháº­t khÃ¡ch hÃ ng." : "ÄÃ£ thÃªm khÃ¡ch hÃ ng má»›i.", "success");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ lÆ°u khÃ¡ch hÃ ng.", "error");
        }
      });

      roomOccupancyForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
          const data = new FormData(roomOccupancyForm);
          const roomId = clean(data.get("roomId"));
          await updateRoomOccupancy(roomId, {
            status: clean(data.get("status")),
            checkInDate: clean(data.get("checkInDate")),
            checkOutDate: clean(data.get("checkOutDate")),
          });
          await reloadBootstrap();
          await refreshRooms();
          fillRoomOccupancyOptions(roomId);
          showNotice("ÄÃ£ cáº­p nháº­t váº­n hÃ nh phÃ²ng.", "success");
        } catch (error) {
          showNotice(error.message || "KhÃ´ng thá»ƒ cáº­p nháº­t váº­n hÃ nh phÃ²ng.", "error");
        }
      });

      renderStatic();
      repairDomText(document.body);
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
        showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
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
          adminRoomGrid.innerHTML = '<div class="empty-state-card">Äang táº£i danh sÃ¡ch phÃ²ng...</div>';
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
          adminRoomGrid.innerHTML = `<div class="empty-state-card">${error.message || "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch phÃ²ng."}</div>`;
          adminRoomsPagination.textContent = "Lá»—i táº£i dá»¯ liá»‡u";
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
        fillRoomOccupancyOptions();
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
        roomBuildingFilter.innerHTML = '<option value="">Táº¥t cáº£ tÃ²a nhÃ </option>' +
          state.buildings.map((building) => `<option value="${building.id}">${building.name}</option>`).join("");
        if (state.buildings.some((building) => building.id === currentValue)) {
          roomBuildingFilter.value = currentValue;
        }
      }

      function fillRoomOccupancyOptions(selectedRoomId) {
        const currentValue = selectedRoomId || roomOccupancyRoomId.value;
        loadState().then((fullState) => {
          const items = (normalizeState(fullState).rooms || []).map((room) => {
            const building = state.buildings.find((item) => item.id === room.buildingId);
            return Object.assign({}, room, {
              buildingName: building ? building.name : "",
            });
          });
          roomOccupancyRoomId.innerHTML = items.map((room) => (
            `<option value="${room.id}">${room.name} â€¢ ${room.buildingName || room.region}</option>`
          )).join("");
          if (items.some((room) => room.id === currentValue)) {
            roomOccupancyRoomId.value = currentValue;
          }
          syncRoomOccupancyForm(items.find((room) => room.id === roomOccupancyRoomId.value) || items[0]);
        }).catch(() => {
          roomOccupancyRoomId.innerHTML = '<option value="">ChÆ°a cÃ³ phÃ²ng</option>';
        });
      }

      function fillCustomerOptionInputs() {
        const config = state.customerConfig || { platforms: [], regions: [], statuses: [] };
        fillSelectWithPlaceholder(customerPlatformInput, config.platforms, "Chá»n ná»n táº£ng");
        fillSelectWithPlaceholder(customerRegionInput, config.regions, "Chá»n khu vá»±c");
        fillSelectWithPlaceholder(customerStatusInput, config.statuses, "Chá»n tÃ¬nh tráº¡ng");
        if (!customerStatusInput.value && config.statuses[0]) {
          customerStatusInput.value = config.statuses[0];
        }
      }

      function fillCustomerFilterOptions() {
        const config = state.customerConfig || { platforms: [], regions: [], statuses: [] };
        fillSelectWithPlaceholder(customerPlatformFilter, config.platforms, "Táº¥t cáº£ ná»n táº£ng", true);
        fillSelectWithPlaceholder(customerRegionFilter, config.regions, "Táº¥t cáº£ khu vá»±c", true);
        fillSelectWithPlaceholder(customerStatusFilter, config.statuses, "Táº¥t cáº£ tÃ¬nh tráº¡ng", true);
      }

      function renderCustomerStats() {
        const stats = (state.meta && state.meta.customerStats) || {
          totalCustomers: 0,
          totalClosedCustomers: 0,
          byAdmin: [],
        };
        const closeRate = stats.totalCustomers
          ? `${Math.round((Number(stats.totalClosedCustomers || 0) / Number(stats.totalCustomers || 1)) * 100)}%`
          : "0%";
        const cards = [
          { label: "Tá»•ng khÃ¡ch hÃ ng", value: stats.totalCustomers, note: "Data Ä‘ang Ä‘Æ°á»£c quáº£n lÃ½ trong há»‡ thá»‘ng" },
          { label: "KhÃ¡ch Ä‘Ã£ chá»‘t", value: stats.totalClosedCustomers, note: "Sá»‘ khÃ¡ch cÃ³ tráº¡ng thÃ¡i Ä‘Ã£ chá»‘t" },
          { label: "Tá»· lá»‡ chá»‘t", value: closeRate, note: "Tá»· lá»‡ khÃ¡ch Ä‘Ã£ chuyá»ƒn sang tráº¡ng thÃ¡i chá»‘t" },
          { label: "Admin hoáº¡t Ä‘á»™ng", value: stats.byAdmin.length, note: "Sá»‘ tÃ i khoáº£n Ä‘Ã£ nháº­p data khÃ¡ch hÃ ng" },
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
              <p class="muted-copy">ÄÃ£ tiáº¿p cáº­n ${item.totalCustomers} khÃ¡ch, chá»‘t ${item.closedCustomers} khÃ¡ch</p>
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
          buildingTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">KhÃ´ng cÃ³ tÃ²a nhÃ  phÃ¹ há»£p.</div></td></tr>';
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
                <button type="button" data-action="edit" data-id="${building.id}">Sá»­a</button>
                <button type="button" class="danger" data-action="delete" data-id="${building.id}">XÃ³a</button>
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
              showNotice(`Äang chá»‰nh sá»­a tÃ²a nhÃ  ${building.name}.`, "info");
              return;
            }

            const confirmed = window.confirm(`XÃ³a tÃ²a nhÃ  "${building.name}" vÃ  toÃ n bá»™ phÃ²ng thuá»™c tÃ²a nhÃ  nÃ y?`);
            if (!confirmed) return;
            try {
              showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
              const fullState = normalizeState(await loadState());
              fullState.buildings = fullState.buildings.filter((item) => item.id !== building.id);
              fullState.rooms = (fullState.rooms || []).filter((room) => room.buildingId !== building.id);
              await saveState(fullState);
              await reloadBootstrap();
              if (roomBuildingFilter.value === building.id) {
                roomBuildingFilter.value = "";
              }
              await refreshRooms();
              showNotice("ÄÃ£ xÃ³a tÃ²a nhÃ  vÃ  cÃ¡c phÃ²ng liÃªn quan.", "success");
            } catch (error) {
              showNotice(error.message || "KhÃ´ng thá»ƒ xÃ³a tÃ²a nhÃ .", "error");
            }
          });
        });
      }

      function renderRoomCards() {
        if (!currentRoomItems.length) {
          adminRoomGrid.innerHTML = '<div class="empty-state-card">KhÃ´ng cÃ³ phÃ²ng phÃ¹ há»£p.</div>';
          adminRoomsPagination.textContent = roomPaging.totalItems ? `Trang ${roomPaging.page} / ${roomPaging.totalPages}` : "0 phÃ²ng";
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
            <p>${room.buildingName || "KhÃ´ng xÃ¡c Ä‘á»‹nh"} | ${room.type}</p>
            <div class="room-meta">
              <div><strong>Khu vá»±c:</strong> ${room.region}</div>
              <div><strong>GiÃ¡ thuÃª:</strong> ${room.rent}</div>
              <div><strong>NgÃ y trá»‘ng:</strong> ${formatDate(room.availableFrom)}</div>
            </div>
            <div class="room-actions">
              <button type="button" data-room-action="edit" data-id="${room.id}">Sá»­a</button>
              <button type="button" class="danger" data-room-action="delete" data-id="${room.id}">XÃ³a</button>
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
              showNotice(`Äang chá»‰nh sá»­a phÃ²ng ${room.name}.`, "info");
              return;
            }

            const confirmed = window.confirm(`XÃ³a phÃ²ng "${room.name}"?`);
            if (!confirmed) return;
            try {
              showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
              await deleteRoom(room.id);
              await reloadBootstrap();
              if (roomPaging.page > 1 && currentRoomItems.length === 1) {
                roomPaging.page -= 1;
              }
              await refreshRooms();
              showNotice("ÄÃ£ xÃ³a phÃ²ng.", "success");
            } catch (error) {
              showNotice(error.message || "KhÃ´ng thá»ƒ xÃ³a phÃ²ng.", "error");
            }
          });
        });

        adminRoomsPagination.textContent = `Trang ${roomPaging.page} / ${roomPaging.totalPages} â€¢ ${roomPaging.totalItems} phÃ²ng`;
        adminRoomsPrevButton.disabled = roomPaging.page <= 1;
        adminRoomsNextButton.disabled = roomPaging.page >= roomPaging.totalPages;
      }

      async function refreshCustomers() {
        try {
          customerTableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state-inline">Äang táº£i dá»¯ liá»‡u khÃ¡ch hÃ ng...</div></td></tr>';
          const response = await loadCustomersPage({
            page: customerPaging.page,
            limit: Number(customerPageSize.value) || 10,
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
          customerTableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state-inline">${error.message || "KhÃ´ng thá»ƒ táº£i data khÃ¡ch hÃ ng."}</div></td></tr>`;
          customersPagination.textContent = "Lá»—i táº£i dá»¯ liá»‡u";
          customersPrevButton.disabled = true;
          customersNextButton.disabled = true;
        }
      }

      function renderCustomerTable() {
        if (!currentCustomerItems.length) {
          customerTableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state-inline">KhÃ´ng cÃ³ khÃ¡ch hÃ ng phÃ¹ há»£p.</div></td></tr>';
          customersPagination.textContent = customerPaging.totalItems ? `Trang ${customerPaging.page} / ${customerPaging.totalPages}` : "0 khÃ¡ch hÃ ng";
          customersPrevButton.disabled = true;
          customersNextButton.disabled = true;
          return;
        }

        customerTableBody.innerHTML = "";
        currentCustomerItems.forEach((customer) => {
          const closeLabel = customer.closeStatus === "closed" ? "ÄÃ£ chá»‘t" : "ChÆ°a chá»‘t";
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${customer.name}</strong><br><span>${customer.phone}</span><br><small>${customer.demand}</small></td>
            <td>${customer.platform}</td>
            <td>${customer.region}</td>
            <td>${customer.status}<br><small>${closeLabel}</small></td>
            <td>${formatDateTime(customer.createdAt)}<br><small>Cáº­p nháº­t: ${formatDateTime(customer.updatedAt)}</small></td>
            <td>${customer.createdByName || "Admin"}<br><small>${customer.createdByEmail || ""}</small></td>
            <td>
              <div class="action-group">
                <button type="button" data-customer-action="edit" data-id="${customer.id}">Sá»­a</button>
                ${currentRole === "admin" ? `<button type="button" class="danger" data-customer-action="delete" data-id="${customer.id}">XÃ³a</button>` : ""}
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
              window.setTimeout(() => scrollToForm(customerForm, "name"), 80);
              showNotice(`Äang chá»‰nh sá»­a khÃ¡ch hÃ ng ${customer.name}.`, "info");
              return;
            }

            const confirmed = window.confirm(`XÃ³a khÃ¡ch hÃ ng "${customer.name}"?`);
            if (!confirmed) return;
            try {
              showNotice("Äang lÆ°u dá»¯ liá»‡u...", "info");
              await deleteCustomer(customer.id);
              await reloadBootstrap();
              if (customerPaging.page > 1 && currentCustomerItems.length === 1) {
                customerPaging.page -= 1;
              }
              await refreshCustomers();
              showNotice("ÄÃ£ xÃ³a khÃ¡ch hÃ ng.", "success");
            } catch (error) {
              showNotice(error.message || "KhÃ´ng thá»ƒ xÃ³a khÃ¡ch hÃ ng.", "error");
            }
          });
        });

        customersPagination.textContent = `Trang ${customerPaging.page} / ${customerPaging.totalPages} â€¢ ${customerPaging.totalItems} khÃ¡ch`;
        customersPrevButton.disabled = customerPaging.page <= 1;
        customersNextButton.disabled = customerPaging.page >= customerPaging.totalPages;
      }

      function addCustomerOption(type) {
        const label = type === "platform" ? "ná»n táº£ng" : "khu vá»±c";
        const value = window.prompt(`Nháº­p ${label} má»›i`);
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
          adminNewsGrid.innerHTML = '<div class="empty-state-card">KhÃ´ng cÃ³ bÃ i viáº¿t phÃ¹ há»£p.</div>';
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
                <span class="status-pill ${item.status === "draft" ? "status-upcoming" : "status-available"}">${item.status === "draft" ? "NhÃ¡p" : "ÄÃ£ Ä‘Äƒng"}</span>
              </div>
              <h3>${item.title}</h3>
              <p class="news-card-date">${formatDate(item.publishedAt)}</p>
              <p>${item.excerpt}</p>
              <div class="room-actions">
                <button type="button" data-news-action="edit" data-id="${item.id}">Sá»­a</button>
                <button type="button" class="danger" data-news-action="delete" data-id="${item.id}">XÃ³a</button>
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
              showNotice(`Äang chá»‰nh sá»­a bÃ i viáº¿t ${item.title}.`, "info");
              return;
            }

            const confirmed = window.confirm(`XÃ³a bÃ i viáº¿t "${item.title}"?`);
            if (!confirmed) return;
            state.news = state.news.filter((entry) => entry.id !== item.id);
            await persistMutation((fullState) => {
              fullState.news = state.news;
            }, "ÄÃ£ xÃ³a bÃ i viáº¿t.");
          });
        });
      }

      function renderAdminAccounts() {
        const keyword = adminSearch.value.trim().toLowerCase();
        const admins = state.admins.filter((admin) =>
          [admin.name, admin.email].join(" ").toLowerCase().includes(keyword)
        );
        if (!admins.length) {
          adminAccountTableBody.innerHTML = '<tr><td colspan="3"><div class="empty-state-inline">KhÃ´ng cÃ³ tÃ i khoáº£n phÃ¹ há»£p.</div></td></tr>';
          return;
        }

        adminAccountTableBody.innerHTML = "";
        admins.forEach((admin) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${admin.name}</strong></td>
            <td>${admin.email}</td>
            <td>${admin.role === "manager" ? "Quáº£n lÃ½" : "Admin"}</td>
            <td>
              <div class="action-group">
                <button type="button" data-admin-action="edit" data-id="${admin.id}">Sá»­a</button>
                <button type="button" class="danger" data-admin-action="delete" data-id="${admin.id}">XÃ³a</button>
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
              adminAccountForm.elements.password.value = "";
              adminAccountForm.elements.role.value = admin.role || "admin";
              activateTab("admins");
              scrollToForm(adminAccountForm, "name");
              showNotice(`Äang chá»‰nh sá»­a tÃ i khoáº£n ${admin.email}.`, "info");
              return;
            }

            if (state.admins.length <= 1) {
              showNotice("Pháº£i giá»¯ láº¡i Ã­t nháº¥t má»™t tÃ i khoáº£n admin.", "error");
              return;
            }
            const confirmed = window.confirm(`XÃ³a tÃ i khoáº£n admin "${admin.email}"?`);
            if (!confirmed) return;
            state.admins = state.admins.filter((item) => item.id !== admin.id);
            await persistMutation((fullState) => {
              fullState.admins = state.admins;
              fullState.admin = {
                email: state.admins[0].email,
                password: state.admins[0].password,
              };
            }, "ÄÃ£ xÃ³a tÃ i khoáº£n admin.");
          });
        });
      }

      function resetBuildingForm(showMessage) {
        buildingForm.reset();
        buildingForm.elements.id.value = "";
        clearFileInputs(buildingForm);
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form tÃ²a nhÃ .", "info");
      }

      function resetRoomForm(showMessage) {
        roomForm.reset();
        roomForm.elements.id.value = "";
        clearFileInputs(roomForm);
        fillRoomBuildingOptions();
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form phÃ²ng.", "info");
      }

      function resetNewsForm(showMessage) {
        newsForm.reset();
        newsForm.elements.id.value = "";
        clearFileInputs(newsForm);
        newsForm.elements.publishedAt.value = new Date().toISOString().slice(0, 10);
        newsForm.elements.status.value = "published";
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form bÃ i viáº¿t.", "info");
      }

      function resetCustomerForm(showMessage) {
        customerForm.reset();
        customerForm.elements.id.value = "";
        customerForm.elements.closeStatus.value = "open";
        fillCustomerOptionInputs();
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form khÃ¡ch hÃ ng.", "info");
      }

      function syncRoomOccupancyForm(room) {
        if (!room) return;
        roomOccupancyRoomId.value = room.id;
        roomOccupancyForm.elements.status.value = room.status || "available";
        roomOccupancyForm.elements.checkInDate.value = room.checkInDate || "";
        roomOccupancyForm.elements.checkOutDate.value = room.checkOutDate || "";
      }

      function resetRoomOccupancyForm(showMessage) {
        roomOccupancyForm.reset();
        fillRoomOccupancyOptions();
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form váº­n hÃ nh phÃ²ng.", "info");
      }

      function resetAdminAccountForm(showMessage) {
        adminAccountForm.reset();
        adminAccountForm.elements.id.value = "";
        if (adminAccountForm.elements.role) adminAccountForm.elements.role.value = "admin";
        if (showMessage) showNotice("ÄÃ£ lÃ m má»›i form tÃ i khoáº£n admin.", "info");
      }

      function showNotice(message, tone) {
        notice.textContent = cleanText(message);
        notice.className = `admin-notice admin-notice-${tone}`;
        repairDomText(notice.closest(".content-section") || document.body);
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

  function setupMainTabs(role) {
    const mainTabs = Array.from(document.querySelectorAll(".admin-main-tab"));
    const subTabbar = document.querySelector(".admin-tabbar");
    const normalizedRole = String(role || "admin").toLowerCase();
    const infoTabs = ["intro", "metrics", "buildings", "rooms", "news", "admins"];

    function setMainTab(tabName) {
      mainTabs.forEach((button) => {
        button.classList.toggle("active", button.dataset.mainTab === tabName);
      });

      if (subTabbar) {
        subTabbar.classList.toggle("hidden", tabName !== "info");
      }

      if (tabName === "customers") {
        activateTab("customers");
        return;
      }

      const currentActiveInfoTab = document.querySelector(".admin-tab.active");
      const nextInfoTab = currentActiveInfoTab && infoTabs.includes(currentActiveInfoTab.dataset.tab)
        ? currentActiveInfoTab.dataset.tab
        : "intro";
      activateTab(nextInfoTab);
    }

    mainTabs.forEach((button) => {
      button.addEventListener("click", () => setMainTab(button.dataset.mainTab));
    });

    if (normalizedRole === "manager") {
      setMainTab("customers");
      return;
    }

    setMainTab("info");
  }

  function activateTab(tabName) {
    const mainTabs = document.querySelectorAll(".admin-main-tab");
    const subTabbar = document.querySelector(".admin-tabbar");
    const isCustomerTab = tabName === "customers";

    mainTabs.forEach((button) => {
      button.classList.toggle("active", button.dataset.mainTab === (isCustomerTab ? "customers" : "info"));
    });
    if (subTabbar) {
      subTabbar.classList.toggle("hidden", isCustomerTab);
    }
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
    });
  }

  function normalizeState(state) {
    const nextState = Object.assign({}, state);
    nextState.content = Object.assign({
      navAdmin: "ÄÄƒng nháº­p",
      navNews: "Tin tá»©c",
      newsPageKicker: "Tin tá»©c",
      newsPageTitle: "BÃ i viáº¿t, tuyá»ƒn dá»¥ng vÃ  thÃ´ng bÃ¡o má»›i",
      newsPageDescription: "Theo dÃµi cáº­p nháº­t hoáº¡t Ä‘á»™ng, bÃ i viáº¿t thá»‹ trÆ°á»ng, chÆ°Æ¡ng trÃ¬nh tuyá»ƒn dá»¥ng vÃ  cÃ¡c thÃ´ng bÃ¡o má»›i tá»« Bhome.",
      newsSectionKicker: "Tin tá»©c",
      newsSectionTitle: "Cáº­p nháº­t má»›i nháº¥t tá»« Bhome",
      newsSectionButton: "Xem táº¥t cáº£ bÃ i viáº¿t",
      announcementEnabled: "true",
      announcementText: "ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i Bhome. Danh má»¥c cÄƒn há»™ Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t liÃªn tá»¥c.",
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
      regions: ["Nha Trang", "Cam Ranh", "DiÃªn KhÃ¡nh"],
      statuses: ["Má»›i", "Äang tÆ° váº¥n", "ÄÃ£ xem phÃ²ng", "ÄÃ£ chá»‘t", "ChÆ°a phÃ¹ há»£p"],
    }, nextState.customerConfig || {});
    nextState.meta = Object.assign({
      roomCountsByBuilding: {},
      totalRooms: 0,
      customerStats: { totalCustomers: 0, totalClosedCustomers: 0, byAdmin: [] },
      customerConfig: nextState.customerConfig,
      session: { adminEmail: "", adminRole: "admin", adminName: "" },
    }, nextState.meta || {});
    nextState.news = nextState.news.map((item) => Object.assign({
      status: "published",
      category: "Tin tá»©c",
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
          name: "Admin chÃ­nh",
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
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    window.setTimeout(() => {
      const field = form.elements.namedItem(focusFieldName);
      if (field && typeof field.focus === "function") field.focus();
    }, 420);
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

