(function () {
  const {
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    buildingDetailLink,
    formatDate,
    getBuildingById,
    getRoomById,
    getRoomsByBuilding,
    loadAdminSession,
    loadCustomersPage,
    loadState,
    logoutAdmin,
    roomDetailLink,
    safeImage,
    statusLabel,
  } = window.NovaData;

  const page = document.body.dataset.page;
  const BUILDINGS_PER_PAGE = 3;
  const ROOMS_PER_PAGE = 10;
  const HOME_NEWS_LIMIT = 3;

  init();

  async function init() {
    try {
      const session = await loadAdminSession().catch(() => ({ authenticated: false, adminRole: "", adminName: "" }));
      if (page === "customers" && !(session.authenticated && session.adminRole === "admin")) {
        window.location.href = "admin-login.html";
        return;
      }

      const state = await loadState();
      setupCommon(state, session);
      if (page === "home") renderHome(state);
      if (page === "building-detail") renderBuildingDetailPage(state);
      if (page === "rooms") renderRoomsPage(state);
      if (page === "customers") renderCustomersPage(session);
      if (page === "news") renderNewsPage(state);
      if (page === "news-detail") renderNewsDetailPage(state);
      if (page === "room-detail") renderRoomDetailPage(state);
    } finally {
      document.body.classList.remove("app-loading");
    }
  }

  function setupCommon(state, session) {
    applyManagedText(state.content);
    setupAnnouncement(state.content);
    setupSessionNavigation(session);
    setupMobileMenu();

    const companyName = document.getElementById("companyName");
    if (companyName) companyName.textContent = state.company.name;
    applyBrand(state.company, state.content);

    const toggle = document.getElementById("contactToggle");
    const card = document.getElementById("contactCard");
    if (toggle && card) toggle.addEventListener("click", () => card.classList.toggle("hidden"));
    setupAnnouncementClose();

    const phoneLink = document.getElementById("contactPhoneLink");
    const zaloLink = document.getElementById("contactZaloLink");
    const facebookLink = document.getElementById("contactFacebookLink");

    if (phoneLink) {
      phoneLink.href = `tel:${state.company.phone}`;
      phoneLink.textContent = `${state.content.contactPhoneLabel}: ${state.company.phone}`;
    }
    if (zaloLink) {
      zaloLink.href = state.company.zalo;
      zaloLink.textContent = state.content.contactZaloLabel;
    }
    if (facebookLink) {
      facebookLink.href = state.company.facebook;
      facebookLink.textContent = state.content.contactFacebookLabel;
    }
  }

  function setupSessionNavigation(session) {
    const navCustomersLink = document.getElementById("navCustomersLink");
    const navManageLink = document.getElementById("navManageLink");
    const navAdminLabel = document.getElementById("navAdminLabel");
    const isAdminSession = Boolean(session && session.authenticated && session.adminRole === "admin");

    if (navCustomersLink) navCustomersLink.classList.toggle("hidden", !isAdminSession);
    if (navManageLink) navManageLink.classList.toggle("hidden", !isAdminSession);
    if (!navAdminLabel) return;

    if (!isAdminSession) {
      navAdminLabel.textContent = "Đăng nhập";
      navAdminLabel.href = "admin-login.html";
      return;
    }

    navAdminLabel.textContent = "Đăng xuất";
    navAdminLabel.href = "#";
    navAdminLabel.addEventListener("click", async (event) => {
      event.preventDefault();
      await logoutAdmin().catch(() => null);
      window.location.href = "index.html";
    });
  }

  function renderHome(state) {
    document.getElementById("heroHeadline").textContent = state.company.headline;
    document.getElementById("heroDescription").textContent = state.company.description;
    document.getElementById("heroBuildingImage").src = safeImage(state.company.heroImage, FALLBACK_BUILDING_IMAGE);
    document.getElementById("companyStory").textContent = state.company.story;
    document.getElementById("companyIndustry").textContent = state.company.industry;
    document.getElementById("companyAddress").textContent = state.company.address;
    document.getElementById("companyEmail").textContent = state.company.email;
    document.getElementById("companyPhone").textContent = state.company.phone;
    document.getElementById("buildingCount").textContent = String(state.buildings.length).padStart(2, "0");
    document.getElementById("roomCount").textContent = String(state.rooms.length).padStart(2, "0");
    document.getElementById("vacantCount").textContent = String(
      state.rooms.filter((room) => room.status === "available").length
    ).padStart(2, "0");
    document.getElementById("heroBadgeText").textContent =
      `${state.buildings.length} tòa nhà đang vận hành và ${state.rooms.length} phòng trong danh mục.`;

    const statTemplate = document.getElementById("statCardTemplate");
    const statGrid = document.getElementById("investorStats");
    statGrid.innerHTML = "";
    state.investorStats.forEach((stat) => {
      const fragment = statTemplate.content.cloneNode(true);
      fragment.querySelector(".stat-label").textContent = stat.label;
      fragment.querySelector(".stat-value").textContent = stat.value;
      fragment.querySelector(".stat-note").textContent = stat.note;
      statGrid.appendChild(fragment);
    });

    const resultsGrid = document.getElementById("resultsGrid");
    resultsGrid.innerHTML = "";
    state.results.forEach((result) => {
      const card = document.createElement("article");
      card.className = "results-card";
      card.innerHTML = `<h3>${result.title}</h3><p>${result.description}</p>`;
      resultsGrid.appendChild(card);
    });

    setupBuildingCarousel(state);
    renderHomeNews(state);
  }

  function renderHomeNews(state) {
    const grid = document.getElementById("homeNewsGrid");
    if (!grid) return;
    const items = [...(state.news || [])]
      .filter((item) => item.status !== "draft")
      .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
      .slice(0, HOME_NEWS_LIMIT);

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state-card">Chưa có bài viết nào được đăng.</div>';
      return;
    }

    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(newsCard(item)));
  }

  function setupBuildingCarousel(state) {
    const buildingGrid = document.getElementById("homeBuildingGrid");
    if (!buildingGrid) return;

    const prevButton = document.getElementById("buildingPrevButton");
    const nextButton = document.getElementById("buildingNextButton");
    const status = document.getElementById("buildingCarouselStatus");
    const totalPages = Math.max(1, Math.ceil(state.buildings.length / BUILDINGS_PER_PAGE));
    let currentPage = 1;

    function renderPage() {
      buildingGrid.innerHTML = "";
      const start = (currentPage - 1) * BUILDINGS_PER_PAGE;
      state.buildings.slice(start, start + BUILDINGS_PER_PAGE).forEach((building) => {
        const roomCount = getRoomsByBuilding(state, building.id).length;
        const card = document.createElement("article");
        card.className = "building-overview-card";
        card.innerHTML = `
          <div class="building-card-image">
            <img src="${safeImage(building.image, FALLBACK_BUILDING_IMAGE)}" alt="${building.name}">
          </div>
          <div class="building-overview-copy">
            <h3>${building.name}</h3>
            <p>${building.description}</p>
            <div class="building-overview-meta">
              <div><strong>Khu vực:</strong> ${building.region}</div>
              <div><strong>Số phòng:</strong> ${roomCount}</div>
              <div><strong>Lấp đầy:</strong> ${building.occupancy}%</div>
            </div>
            <a class="primary-button button-inline" href="${buildingDetailLink(building.id)}">Xem chi tiết</a>
          </div>
        `;
        buildingGrid.appendChild(card);
      });

      status.textContent = `${currentPage} / ${totalPages}`;
      prevButton.disabled = currentPage === 1;
      nextButton.disabled = currentPage === totalPages;
    }

    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderPage();
      }
    });

    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        renderPage();
      }
    });

    renderPage();
  }

  function renderBuildingDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const building = getBuildingById(state, params.get("id"));

    if (!building) {
      document.getElementById("detailPageTitle").textContent = "Không tìm thấy tòa nhà";
      document.getElementById("detailPageSummary").textContent = "Dữ liệu tòa nhà không tồn tại hoặc đã bị xóa.";
      document.getElementById("detailContentGrid").innerHTML =
        '<div class="empty-state-card">Không có nội dung để hiển thị.</div>';
      return;
    }

    document.title = `${building.name} | Chi tiết tòa nhà`;
    document.getElementById("detailPageTitle").textContent = building.name;
    document.getElementById("detailPageSummary").textContent = building.description;

    const gallery = building.gallery && building.gallery.length ? building.gallery : [building.image];
    setupImageGallery(
      gallery,
      "detailMainImage",
      "detailPrevImage",
      "detailNextImage",
      "detailImageStatus",
      "detailImageDots",
      FALLBACK_BUILDING_IMAGE,
      building.name
    );

    const rooms = getRoomsByBuilding(state, building.id);
    document.getElementById("detailContentGrid").innerHTML = `
      <article class="detail-info-card">
        <h3>Thông tin vận hành</h3>
        <ul class="detail-list">
          <li><span>Khu vực</span><strong>${building.region}</strong></li>
          <li><span>Địa chỉ</span><strong>${building.address}</strong></li>
          <li><span>Số tầng</span><strong>${building.floors}</strong></li>
          <li><span>Giá trung bình</span><strong>${building.averageRent}</strong></li>
        </ul>
      </article>
      <article class="detail-info-card">
        <h3>Góc nhìn đầu tư</h3>
        <ul class="detail-list">
          <li><span>Tỷ lệ lấp đầy</span><strong>${building.occupancy}%</strong></li>
          <li><span>Điểm nhấn</span><strong>${building.investmentHighlight}</strong></li>
          <li><span>Tổng phòng</span><strong>${rooms.length}</strong></li>
          <li><span>Phòng đang trống</span><strong>${rooms.filter((room) => room.status === "available").length}</strong></li>
        </ul>
      </article>
    `;

    const grid = document.getElementById("detailRoomsGrid");
    if (!rooms.length) {
      grid.innerHTML = '<div class="empty-state-card">Chưa có phòng nào được cập nhật.</div>';
      return;
    }

    grid.innerHTML = "";
    rooms.forEach((room) => grid.appendChild(roomCard(room, building.name)));
  }

  function renderRoomsPage(state) {
    const regionFilter = document.getElementById("regionFilter");
    const buildingFilter = document.getElementById("buildingFilter");
    const statusFilter = document.getElementById("statusFilter");
    const grid = document.getElementById("roomsPageGrid");
    const prevButton = document.getElementById("roomsPrevButton");
    const nextButton = document.getElementById("roomsNextButton");
    const numbers = document.getElementById("roomsPaginationNumbers");

    fillSelect(regionFilter, ["Tất cả khu vực"].concat(unique(state.rooms.map((room) => room.region))));
    fillSelect(buildingFilter, ["Tất cả tòa nhà"].concat(state.buildings.map((building) => building.name)));
    fillSelect(statusFilter, ["Tất cả trạng thái", "Đang trống", "Đã có khách", "Sắp trống"]);

    let currentPage = 1;

    [regionFilter, buildingFilter, statusFilter].forEach((select) =>
      select.addEventListener("change", () => {
        currentPage = 1;
        render();
      })
    );

    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        render();
      }
    });

    nextButton.addEventListener("click", () => {
      const filtered = getFilteredRooms();
      const totalPages = Math.max(1, Math.ceil(filtered.length / ROOMS_PER_PAGE));
      if (currentPage < totalPages) {
        currentPage += 1;
        render();
      }
    });

    render();

    function getFilteredRooms() {
      return state.rooms.filter((room) => {
        const building = getBuildingById(state, room.buildingId);
        const regionMatch = regionFilter.value === "Tất cả khu vực" || room.region === regionFilter.value;
        const buildingMatch = buildingFilter.value === "Tất cả tòa nhà" || (building && building.name === buildingFilter.value);
        const statusMatch = statusFilter.value === "Tất cả trạng thái" || statusLabel(room.status) === statusFilter.value;
        return regionMatch && buildingMatch && statusMatch;
      });
    }

    function renderPagination(totalPages) {
      numbers.innerHTML = "";
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `page-chip${pageNumber === currentPage ? " active" : ""}`;
        button.textContent = String(pageNumber);
        button.addEventListener("click", () => {
          currentPage = pageNumber;
          render();
        });
        numbers.appendChild(button);
      }
      prevButton.disabled = currentPage === 1;
      nextButton.disabled = currentPage === totalPages;
    }

    function render() {
      grid.innerHTML = "";
      const filtered = getFilteredRooms();
      const totalPages = Math.max(1, Math.ceil(filtered.length / ROOMS_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages);

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state-card">Không có phòng phù hợp với bộ lọc hiện tại.</div>';
        numbers.innerHTML = "";
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
      }

      const start = (currentPage - 1) * ROOMS_PER_PAGE;
      filtered.slice(start, start + ROOMS_PER_PAGE).forEach((room) => {
        const building = getBuildingById(state, room.buildingId);
        grid.appendChild(roomCard(room, building ? building.name : "Không xác định"));
      });

      renderPagination(totalPages);
    }
  }

  function renderCustomersPage(session) {
    const statsGrid = document.getElementById("customerStatsPublic");
    const tableBody = document.getElementById("customerPublicTableBody");
    const searchInput = document.getElementById("customerPublicSearch");
    const pageSizeSelect = document.getElementById("customerPublicPageSize");
    const platformFilter = document.getElementById("customerPublicPlatform");
    const regionFilter = document.getElementById("customerPublicRegion");
    const statusFilter = document.getElementById("customerPublicStatus");
    const prevButton = document.getElementById("customerPublicPrev");
    const nextButton = document.getElementById("customerPublicNext");
    const pagination = document.getElementById("customerPublicPagination");
    const paging = { page: 1, totalPages: 1, totalItems: 0 };

    [searchInput, pageSizeSelect, platformFilter, regionFilter, statusFilter].forEach((element) => {
      element.addEventListener("input", handleFilterChange);
      element.addEventListener("change", handleFilterChange);
    });

    prevButton.addEventListener("click", () => {
      if (paging.page <= 1) return;
      paging.page -= 1;
      refresh();
    });

    nextButton.addEventListener("click", () => {
      if (paging.page >= paging.totalPages) return;
      paging.page += 1;
      refresh();
    });

    refresh();

    function handleFilterChange() {
      paging.page = 1;
      refresh();
    }

    async function refresh() {
      try {
        tableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">Đang tải dữ liệu khách hàng...</div></td></tr>';
        const response = await loadCustomersPage({
          page: paging.page,
          limit: Number(pageSizeSelect.value) || 10,
          search: searchInput.value.trim(),
          platform: platformFilter.value,
          region: regionFilter.value,
          status: statusFilter.value,
        });

        paging.page = response.page || 1;
        paging.totalPages = response.totalPages || 1;
        paging.totalItems = response.totalItems || 0;

        fillSelect(platformFilter, ["Tất cả nền tảng"].concat(response.filters?.platforms || []));
        fillSelect(regionFilter, ["Tất cả khu vực"].concat(response.filters?.regions || []));
        fillSelect(statusFilter, ["Tất cả tình trạng"].concat(response.filters?.statuses || []));

        renderCustomerPublicStats(response.stats || { totalCustomers: 0, totalClosedCustomers: 0, byAdmin: [] }, session);
        renderCustomerPublicRows(response.items || []);
        renderPagination();
      } catch (error) {
        if ((error.message || "").includes("Unauthorized")) {
          window.location.href = "admin-login.html";
          return;
        }
        tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state-inline">${error.message || "Không thể tải dữ liệu khách hàng."}</div></td></tr>`;
      }
    }

    function renderCustomerPublicStats(stats, currentSession) {
      const closeRate = stats.totalCustomers
        ? `${Math.round((Number(stats.totalClosedCustomers || 0) / Number(stats.totalCustomers || 1)) * 100)}%`
        : "0%";
      const cards = [
        { label: "Tổng khách hàng", value: stats.totalCustomers || 0, note: "Toàn bộ data khách hàng đang được quản lý" },
        { label: "Khách đã chốt", value: stats.totalClosedCustomers || 0, note: "Khách đã chuyển sang trạng thái chốt" },
        { label: "Tỷ lệ chốt", value: closeRate, note: "Tỷ lệ chuyển đổi hiện tại trên toàn bộ danh sách" },
        { label: "Tài khoản xem", value: currentSession.adminName || currentSession.adminEmail || "Admin", note: "Phiên đăng nhập hiện tại" },
      ];
      statsGrid.innerHTML = cards.map((item) => `
        <article class="admin-stat-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <p class="muted-copy">${item.note}</p>
        </article>
      `).join("");
    }

    function renderCustomerPublicRows(items) {
      if (!items.length) {
        tableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state-inline">Không có khách hàng phù hợp với bộ lọc hiện tại.</div></td></tr>';
        return;
      }

      tableBody.innerHTML = "";
      items.forEach((customer) => {
        const closeLabel = customer.closeStatus === "closed" ? "Đã chốt" : "Chưa chốt";
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${customer.name}</strong><br><span>${customer.phone}</span></td>
          <td>${customer.platform}</td>
          <td>${customer.region}</td>
          <td>${customer.status}<br><small>${closeLabel}</small></td>
          <td>${customer.demand || "Chưa cập nhật"}<br><small>${customer.note || ""}</small></td>
          <td>${customer.createdByName || "Admin"}<br><small>${customer.createdByEmail || ""}</small></td>
        `;
        tableBody.appendChild(row);
      });
    }

    function renderPagination() {
      pagination.innerHTML = "";
      for (let pageNumber = 1; pageNumber <= paging.totalPages; pageNumber += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `page-chip${pageNumber === paging.page ? " active" : ""}`;
        button.textContent = String(pageNumber);
        button.addEventListener("click", () => {
          paging.page = pageNumber;
          refresh();
        });
        pagination.appendChild(button);
      }
      prevButton.disabled = paging.page <= 1;
      nextButton.disabled = paging.page >= paging.totalPages;
    }
  }

  function renderRoomDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const room = getRoomById(state, params.get("id"));

    if (!room) {
      document.getElementById("roomDetailTitle").textContent = "Không tìm thấy phòng";
      document.getElementById("roomDetailSummary").textContent = "Phòng không tồn tại hoặc đã bị xóa.";
      document.getElementById("roomDetailContent").innerHTML =
        '<div class="empty-state-card">Không có nội dung để hiển thị.</div>';
      return;
    }

    const building = getBuildingById(state, room.buildingId);
    document.title = `${room.name} | Chi tiết phòng`;
    document.getElementById("roomDetailTitle").textContent = room.name;
    document.getElementById("roomDetailSummary").textContent =
      `${building ? building.name : "Không xác định"} | ${room.type} | ${statusLabel(room.status)}`;

    setupImageGallery(
      [room.image],
      "roomDetailImage",
      "roomPrevImage",
      "roomNextImage",
      "roomImageStatus",
      "roomImageDots",
      FALLBACK_ROOM_IMAGE,
      room.name
    );

    document.getElementById("roomDetailContent").innerHTML = `
      <article class="detail-info-card">
        <h3>Thông tin cơ bản</h3>
        <ul class="detail-list">
          <li><span>Tòa nhà</span><strong>${building ? building.name : "Không xác định"}</strong></li>
          <li><span>Khu vực</span><strong>${room.region}</strong></li>
          <li><span>Loại phòng</span><strong>${room.type}</strong></li>
          <li><span>Trạng thái</span><strong>${statusLabel(room.status)}</strong></li>
        </ul>
      </article>
      <article class="detail-info-card">
        <h3>Thông tin cho thuê</h3>
        <ul class="detail-list">
          <li><span>Giá thuê</span><strong>${room.rent}</strong></li>
          <li><span>Ngày trống</span><strong>${formatDate(room.availableFrom)}</strong></li>
          <li><span>Diện tích</span><strong>${room.area}</strong></li>
          <li><span>Tiện ích</span><strong>${room.amenities}</strong></li>
        </ul>
      </article>
    `;
  }

  function renderNewsPage(state) {
    const grid = document.getElementById("newsPageGrid");
    const items = [...(state.news || [])]
      .filter((item) => item.status !== "draft")
      .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state-card">Chưa có bài viết nào được đăng.</div>';
      return;
    }

    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(newsCard(item)));
  }

  function renderNewsDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const item = (state.news || []).find((entry) => entry.id === params.get("id") && entry.status !== "draft");

    if (!item) {
      document.getElementById("newsDetailTitle").textContent = "Không tìm thấy bài viết";
      document.getElementById("newsDetailMeta").textContent = "Bài viết không tồn tại hoặc đã bị xóa.";
      document.getElementById("newsDetailBody").innerHTML = '<div class="empty-state-card">Không có nội dung để hiển thị.</div>';
      return;
    }

    document.title = `${item.title} | Tin tức Bhome`;
    document.getElementById("newsDetailTitle").textContent = item.title;
    document.getElementById("newsDetailMeta").textContent = `${item.category} | ${formatDate(item.publishedAt)}`;
    document.getElementById("newsDetailImage").src = safeImage(item.image, FALLBACK_BUILDING_IMAGE);
    document.getElementById("newsDetailImage").alt = item.title;
    document.getElementById("newsDetailBody").innerHTML = `
      <p class="news-badge">${item.category}</p>
      <p class="muted-copy">${item.excerpt}</p>
      ${item.body.split(/\r?\n/).filter(Boolean).map((paragraph) => `<p>${paragraph}</p>`).join("")}
    `;
  }

  function setupImageGallery(images, imageId, prevId, nextId, statusId, dotsId, fallback, altText) {
    const safeImages = (images && images.length ? images : [fallback]).map((item) => safeImage(item, fallback));
    const imageElement = document.getElementById(imageId);
    const prevButton = document.getElementById(prevId);
    const nextButton = document.getElementById(nextId);
    const status = document.getElementById(statusId);
    const dots = document.getElementById(dotsId);
    let currentIndex = 0;

    if (dots) {
      dots.innerHTML = "";
      safeImages.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "gallery-dot";
        dot.setAttribute("aria-label", `Chuyển đến ảnh ${index + 1}`);
        dot.addEventListener("click", () => {
          currentIndex = index;
          renderImage();
        });
        dots.appendChild(dot);
      });
    }

    function renderImage() {
      imageElement.src = safeImages[currentIndex];
      imageElement.alt = altText;
      if (status) status.textContent = `${currentIndex + 1} / ${safeImages.length}`;
      if (prevButton) prevButton.disabled = currentIndex === 0;
      if (nextButton) nextButton.disabled = currentIndex === safeImages.length - 1;
      if (dots) {
        Array.from(dots.children).forEach((dot, index) => {
          dot.classList.toggle("active", index === currentIndex);
        });
      }
    }

    if (prevButton) {
      prevButton.onclick = () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderImage();
        }
      };
    }

    if (nextButton) {
      nextButton.onclick = () => {
        if (currentIndex < safeImages.length - 1) {
          currentIndex += 1;
          renderImage();
        }
      };
    }

    renderImage();
  }

  function setupMobileMenu() {
    const button = document.getElementById("mobileMenuToggle");
    const nav = document.getElementById("primaryNav");
    if (!button || !nav) return;

    const closeMenu = () => {
      nav.classList.remove("nav-links-open");
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("mobile-nav-open");
    };

    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("nav-links-open");
      button.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("mobile-nav-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("nav-links-open")) return;
      if (nav.contains(event.target) || button.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 720) closeMenu();
    });
  }

  function fillSelect(select, values) {
    select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function roomCard(room, buildingName) {
    const card = document.createElement("article");
    card.className = "room-card room-card-refined";
    card.innerHTML = `
      <div class="room-visual">
        <img src="${safeImage(room.image, FALLBACK_ROOM_IMAGE)}" alt="${room.name}">
      </div>
      <span class="status-pill status-${room.status}">${statusLabel(room.status)}</span>
      <h3>${room.name}</h3>
      <p>${buildingName} | ${room.type}</p>
      <div class="room-meta">
        <div><strong>Khu vực:</strong> ${room.region}</div>
        <div><strong>Giá thuê:</strong> ${room.rent}</div>
        <div><strong>Ngày trống:</strong> ${formatDate(room.availableFrom)}</div>
      </div>
      <a class="secondary-button button-inline room-detail-button" href="${roomDetailLink(room.id)}">Xem chi tiết</a>
    `;
    return card;
  }

  function newsCard(item) {
    const card = document.createElement("article");
    card.className = "news-card";
    card.innerHTML = `
      <div class="news-card-image">
        <img src="${safeImage(item.image, FALLBACK_BUILDING_IMAGE)}" alt="${item.title}">
      </div>
      <div class="news-card-copy">
        <div class="news-card-tags">
          <span class="news-badge">${item.category}</span>
        </div>
        <h3>${item.title}</h3>
        <p class="news-card-date">${formatDate(item.publishedAt)}</p>
        <p>${item.excerpt}</p>
        <a class="secondary-button button-inline" href="${newsDetailLink(item.id)}">Đọc bài viết</a>
      </div>
    `;
    return card;
  }

  function applyManagedText(content) {
    setText("brandEyebrow", content.brandEyebrow);
    setText("navAboutLabel", content.navAbout);
    setText("navRoomsLabel", content.navRooms);
    setText("navNewsLabel", content.navNews);
    setText("navAdminLabel", !content.navAdmin || content.navAdmin === "Admin" ? "Đăng nhập" : content.navAdmin);
    setText("heroKicker", content.heroKicker);
    setText("heroPrimaryButton", content.heroPrimaryButton);
    setText("heroSecondaryButton", content.heroSecondaryButton);
    setText("companySectionKicker", content.companySectionKicker);
    setText("companySectionTitle", content.companySectionTitle);
    setText("portfolioSectionKicker", content.portfolioSectionKicker);
    setText("portfolioSectionTitle", content.portfolioSectionTitle);
    setText("resultsSectionKicker", content.resultsSectionKicker);
    setText("resultsSectionTitle", content.resultsSectionTitle);
    setText("buildingsSectionKicker", content.buildingsSectionKicker);
    setText("buildingsSectionTitle", content.buildingsSectionTitle);
    setText("detailPageKicker", content.detailPageKicker);
    setText("detailRoomsSectionKicker", content.detailRoomsSectionKicker);
    setText("detailRoomsSectionTitle", content.detailRoomsSectionTitle);
    setText("detailRoomsButton", content.detailRoomsButton);
    setText("roomsPageKicker", content.roomsPageKicker);
    setText("roomsPageTitle", content.roomsPageTitle);
    setText("roomsPageDescription", content.roomsPageDescription);
    setText("newsPageKicker", content.newsPageKicker);
    setText("newsPageTitle", content.newsPageTitle);
    setText("newsPageDescription", content.newsPageDescription);
    setText("newsSectionKicker", content.newsSectionKicker);
    setText("newsSectionTitle", content.newsSectionTitle);
    setText("newsSectionButton", content.newsSectionButton);
    setText("contactToggle", content.contactToggle);
    setText("contactTitle", content.contactTitle);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setupAnnouncement(content) {
    const bar = document.getElementById("announcementBar");
    const primary = document.getElementById("announcementContent");
    const clone = document.getElementById("announcementContentClone");
    if (!bar || !primary || !clone) return;

    const text = String(content.announcementText || "").trim();
    const enabled = String(content.announcementEnabled) === "true";
    if (!enabled || !text) {
      bar.classList.add("hidden");
      return;
    }

    primary.textContent = text;
    clone.textContent = text;
    bar.classList.remove("hidden");
  }

  function setupAnnouncementClose() {
    const closeButton = document.getElementById("announcementClose");
    const bar = document.getElementById("announcementBar");
    if (!closeButton || !bar) return;

    if (window.sessionStorage.getItem("bhomeAnnouncementClosed") === "true") {
      bar.classList.add("hidden");
    }

    closeButton.addEventListener("click", () => {
      bar.classList.add("hidden");
      window.sessionStorage.setItem("bhomeAnnouncementClosed", "true");
    });
  }

  function newsDetailLink(id) {
    return `news-detail.html?id=${encodeURIComponent(id)}`;
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
})();
