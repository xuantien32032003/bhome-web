(function () {
  const {
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    buildingDetailLink,
    buildCustomersExportLink,
    formatDate,
    formatDateTime,
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
      if (page === "customers" && !session.authenticated) {
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
    const isAuthenticated = Boolean(session && session.authenticated);
    const role = String((session && session.adminRole) || "").toLowerCase();
    const canViewCustomers = isAuthenticated;
    const canManage = isAuthenticated && (role === "admin" || role === "manager");

    if (navCustomersLink) navCustomersLink.classList.toggle("hidden", !canViewCustomers);
    if (navManageLink) navManageLink.classList.toggle("hidden", !canManage);
    if (!navAdminLabel) return;

    if (!isAuthenticated) {
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
      grid.innerHTML = '<div class="empty-state-card">ChÆ°a cÃ³ bÃ i viáº¿t nÃ o Ä‘Æ°á»£c Ä‘Äƒng.</div>';
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
              <div><strong>Khu vá»±c:</strong> ${building.region}</div>
              <div><strong>Sá»‘ phÃ²ng:</strong> ${roomCount}</div>
              <div><strong>Láº¥p Ä‘áº§y:</strong> ${building.occupancy}%</div>
            </div>
            <a class="primary-button button-inline" href="${buildingDetailLink(building.id)}">Xem chi tiáº¿t</a>
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
      document.getElementById("detailPageTitle").textContent = "KhÃ´ng tÃ¬m tháº¥y tÃ²a nhÃ ";
      document.getElementById("detailPageSummary").textContent = "Dá»¯ liá»‡u tÃ²a nhÃ  khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ xÃ³a.";
      document.getElementById("detailContentGrid").innerHTML =
        '<div class="empty-state-card">KhÃ´ng cÃ³ ná»™i dung Ä‘á»ƒ hiá»ƒn thá»‹.</div>';
      return;
    }

    document.title = `${building.name} | Chi tiáº¿t tÃ²a nhÃ `;
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
        <h3>ThÃ´ng tin váº­n hÃ nh</h3>
        <ul class="detail-list">
          <li><span>Khu vá»±c</span><strong>${building.region}</strong></li>
          <li><span>Äá»‹a chá»‰</span><strong>${building.address}</strong></li>
          <li><span>Sá»‘ táº§ng</span><strong>${building.floors}</strong></li>
          <li><span>GiÃ¡ trung bÃ¬nh</span><strong>${building.averageRent}</strong></li>
        </ul>
      </article>
      <article class="detail-info-card">
        <h3>GÃ³c nhÃ¬n Ä‘áº§u tÆ°</h3>
        <ul class="detail-list">
          <li><span>Tá»· lá»‡ láº¥p Ä‘áº§y</span><strong>${building.occupancy}%</strong></li>
          <li><span>Äiá»ƒm nháº¥n</span><strong>${building.investmentHighlight}</strong></li>
          <li><span>Tá»•ng phÃ²ng</span><strong>${rooms.length}</strong></li>
          <li><span>PhÃ²ng Ä‘ang trá»‘ng</span><strong>${rooms.filter((room) => room.status === "available").length}</strong></li>
        </ul>
      </article>
    `;

    const grid = document.getElementById("detailRoomsGrid");
    if (!rooms.length) {
      grid.innerHTML = '<div class="empty-state-card">ChÆ°a cÃ³ phÃ²ng nÃ o Ä‘Æ°á»£c cáº­p nháº­t.</div>';
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

    fillSelect(regionFilter, ["Táº¥t cáº£ khu vá»±c"].concat(unique(state.rooms.map((room) => room.region))));
    fillSelect(buildingFilter, ["Táº¥t cáº£ tÃ²a nhÃ "].concat(state.buildings.map((building) => building.name)));
    fillSelect(statusFilter, ["Táº¥t cáº£ tráº¡ng thÃ¡i", "Äang trá»‘ng", "ÄÃ£ cÃ³ khÃ¡ch", "Sáº¯p trá»‘ng"]);

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
        const regionMatch = regionFilter.value === "Táº¥t cáº£ khu vá»±c" || room.region === regionFilter.value;
        const buildingMatch = buildingFilter.value === "Táº¥t cáº£ tÃ²a nhÃ " || (building && building.name === buildingFilter.value);
        const statusMatch = statusFilter.value === "Táº¥t cáº£ tráº¡ng thÃ¡i" || statusLabel(room.status) === statusFilter.value;
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
        grid.innerHTML = '<div class="empty-state-card">KhÃ´ng cÃ³ phÃ²ng phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.</div>';
        numbers.innerHTML = "";
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
      }

      const start = (currentPage - 1) * ROOMS_PER_PAGE;
      filtered.slice(start, start + ROOMS_PER_PAGE).forEach((room) => {
        const building = getBuildingById(state, room.buildingId);
        grid.appendChild(roomCard(room, building ? building.name : "KhÃ´ng xÃ¡c Ä‘á»‹nh"));
      });

      renderPagination(totalPages);
    }
  }

  function renderCustomersPage(session) {
    const statsGrid = document.getElementById("customerStatsPublic");
    const tableBody = document.getElementById("customerPublicTableBody");
    const searchInput = document.getElementById("customerPublicSearch");
    const pageSizeSelect = document.getElementById("customerPublicPageSize");
    const periodFilter = document.getElementById("customerPublicPeriod");
    const platformFilter = document.getElementById("customerPublicPlatform");
    const regionFilter = document.getElementById("customerPublicRegion");
    const statusFilter = document.getElementById("customerPublicStatus");
    const fromDateInput = document.getElementById("customerPublicFromDate");
    const toDateInput = document.getElementById("customerPublicToDate");
    const exportButton = document.getElementById("customerExportButton");
    const prevButton = document.getElementById("customerPublicPrev");
    const nextButton = document.getElementById("customerPublicNext");
    const pagination = document.getElementById("customerPublicPagination");
    const paging = { page: 1, totalPages: 1, totalItems: 0 };

    [searchInput, pageSizeSelect, periodFilter, platformFilter, regionFilter, statusFilter, fromDateInput, toDateInput].forEach((element) => {
      element.addEventListener("input", handleFilterChange);
      element.addEventListener("change", handleFilterChange);
    });

    periodFilter.addEventListener("change", () => {
      if (periodFilter.value) {
        fromDateInput.value = "";
        toDateInput.value = "";
      }
    });

    [fromDateInput, toDateInput].forEach((element) => {
      element.addEventListener("change", () => {
        if (fromDateInput.value || toDateInput.value) {
          periodFilter.value = "";
        }
      });
    });

    exportButton.addEventListener("click", () => {
      window.location.href = buildCustomersExportLink(buildCustomerQuery());
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
        tableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state-inline">Äang táº£i dá»¯ liá»‡u khÃ¡ch hÃ ng...</div></td></tr>';
        const response = await loadCustomersPage({
          ...buildCustomerQuery(),
          page: paging.page,
        });

        paging.page = response.page || 1;
        paging.totalPages = response.totalPages || 1;
        paging.totalItems = response.totalItems || 0;

        fillSelect(platformFilter, [
          { value: "", label: "Táº¥t cáº£ ná»n táº£ng" },
          ...(response.filters?.platforms || []).map((value) => ({ value, label: value })),
        ]);
        fillSelect(regionFilter, [
          { value: "", label: "Táº¥t cáº£ khu vá»±c" },
          ...(response.filters?.regions || []).map((value) => ({ value, label: value })),
        ]);
        fillSelect(statusFilter, [
          { value: "", label: "Táº¥t cáº£ tÃ¬nh tráº¡ng" },
          ...(response.filters?.statuses || []).map((value) => ({ value, label: value })),
        ]);

        renderCustomerPublicStats(response.stats || { totalCustomers: 0, totalClosedCustomers: 0, byAdmin: [] }, session);
        renderCustomerPublicRows(response.items || []);
        renderPagination();
      } catch (error) {
        if ((error.message || "").includes("Unauthorized")) {
          window.location.href = "admin-login.html";
          return;
        }
        tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state-inline">${error.message || "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u khÃ¡ch hÃ ng."}</div></td></tr>`;
      }
    }

    function renderCustomerPublicStats(stats, currentSession) {
      const closeRate = stats.totalCustomers
        ? `${Math.round((Number(stats.totalClosedCustomers || 0) / Number(stats.totalCustomers || 1)) * 100)}%`
        : "0%";
      const cards = [
        { label: "Tá»•ng khÃ¡ch hÃ ng", value: stats.totalCustomers || 0, note: "ToÃ n bá»™ data khÃ¡ch hÃ ng Ä‘ang Ä‘Æ°á»£c quáº£n lÃ½" },
        { label: "KhÃ¡ch Ä‘Ã£ chá»‘t", value: stats.totalClosedCustomers || 0, note: "KhÃ¡ch Ä‘Ã£ chuyá»ƒn sang tráº¡ng thÃ¡i chá»‘t" },
        { label: "Tá»· lá»‡ chá»‘t", value: closeRate, note: "Tá»· lá»‡ chuyá»ƒn Ä‘á»•i hiá»‡n táº¡i trÃªn toÃ n bá»™ danh sÃ¡ch" },
        { label: "TÃ i khoáº£n xem", value: currentSession.adminName || currentSession.adminEmail || "Admin", note: "PhiÃªn Ä‘Äƒng nháº­p hiá»‡n táº¡i" },
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
        tableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state-inline">KhÃ´ng cÃ³ khÃ¡ch hÃ ng phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.</div></td></tr>';
        return;
      }

      tableBody.innerHTML = "";
      items.forEach((customer) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${customer.name}</strong><br><span>${customer.phone}</span></td>
          <td>${customer.platform}</td>
          <td>${customer.region}</td>
          <td>${customer.status}</td>
          <td>${formatDateTime(customer.createdAt)}<br><small>Cáº­p nháº­t: ${formatDateTime(customer.updatedAt)}</small></td>
          <td>${customer.demand || "ChÆ°a cáº­p nháº­t"}</td>
          <td>${customer.note || "KhÃ´ng cÃ³ ghi chÃº"}</td>
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

    function buildCustomerQuery() {
      return {
        limit: Number(pageSizeSelect.value) || 10,
        search: searchInput.value.trim(),
        period: periodFilter.value,
        fromDate: fromDateInput.value,
        toDate: toDateInput.value,
        platform: platformFilter.value,
        region: regionFilter.value,
        status: statusFilter.value,
      };
    }
  }

  function renderRoomDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const room = getRoomById(state, params.get("id"));

    if (!room) {
      document.getElementById("roomDetailTitle").textContent = "KhÃ´ng tÃ¬m tháº¥y phÃ²ng";
      document.getElementById("roomDetailSummary").textContent = "PhÃ²ng khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ xÃ³a.";
      document.getElementById("roomDetailContent").innerHTML =
        '<div class="empty-state-card">KhÃ´ng cÃ³ ná»™i dung Ä‘á»ƒ hiá»ƒn thá»‹.</div>';
      return;
    }

    const building = getBuildingById(state, room.buildingId);
    document.title = `${room.name} | Chi tiáº¿t phÃ²ng`;
    document.getElementById("roomDetailTitle").textContent = room.name;
    document.getElementById("roomDetailSummary").textContent =
      `${building ? building.name : "KhÃ´ng xÃ¡c Ä‘á»‹nh"} | ${room.type} | ${statusLabel(room.status)}`;

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
        <h3>ThÃ´ng tin cÆ¡ báº£n</h3>
        <ul class="detail-list">
          <li><span>TÃ²a nhÃ </span><strong>${building ? building.name : "KhÃ´ng xÃ¡c Ä‘á»‹nh"}</strong></li>
          <li><span>Khu vá»±c</span><strong>${room.region}</strong></li>
          <li><span>Loáº¡i phÃ²ng</span><strong>${room.type}</strong></li>
          <li><span>Tráº¡ng thÃ¡i</span><strong>${statusLabel(room.status)}</strong></li>
        </ul>
      </article>
      <article class="detail-info-card">
        <h3>ThÃ´ng tin cho thuÃª</h3>
        <ul class="detail-list">
          <li><span>GiÃ¡ thuÃª</span><strong>${room.rent}</strong></li>
          <li><span>NgÃ y trá»‘ng</span><strong>${formatDate(room.availableFrom)}</strong></li>
          <li><span>Diá»‡n tÃ­ch</span><strong>${room.area}</strong></li>
          <li><span>Tiá»‡n Ã­ch</span><strong>${room.amenities}</strong></li>
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
      grid.innerHTML = '<div class="empty-state-card">ChÆ°a cÃ³ bÃ i viáº¿t nÃ o Ä‘Æ°á»£c Ä‘Äƒng.</div>';
      return;
    }

    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(newsCard(item)));
  }

  function renderNewsDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const item = (state.news || []).find((entry) => entry.id === params.get("id") && entry.status !== "draft");

    if (!item) {
      document.getElementById("newsDetailTitle").textContent = "KhÃ´ng tÃ¬m tháº¥y bÃ i viáº¿t";
      document.getElementById("newsDetailMeta").textContent = "BÃ i viáº¿t khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ xÃ³a.";
      document.getElementById("newsDetailBody").innerHTML = '<div class="empty-state-card">KhÃ´ng cÃ³ ná»™i dung Ä‘á»ƒ hiá»ƒn thá»‹.</div>';
      return;
    }

    document.title = `${item.title} | Tin tá»©c Bhome`;
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
        dot.setAttribute("aria-label", `Chuyá»ƒn Ä‘áº¿n áº£nh ${index + 1}`);
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
    const previousValue = String(select.value || "");
    select.innerHTML = values
      .map((item) => {
        const option = typeof item === "object" && item !== null
          ? item
          : { value: item, label: item };
        return `<option value="${option.value}">${option.label}</option>`;
      })
      .join("");

    const hasPreviousValue = values.some((item) => {
      const optionValue = typeof item === "object" && item !== null ? String(item.value ?? "") : String(item ?? "");
      return optionValue === previousValue;
    });
    select.value = hasPreviousValue ? previousValue : "";
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
        <div><strong>Khu vá»±c:</strong> ${room.region}</div>
        <div><strong>GiÃ¡ thuÃª:</strong> ${room.rent}</div>
        <div><strong>NgÃ y trá»‘ng:</strong> ${formatDate(room.availableFrom)}</div>
      </div>
      <a class="secondary-button button-inline room-detail-button" href="${roomDetailLink(room.id)}">Xem chi tiáº¿t</a>
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
        <a class="secondary-button button-inline" href="${newsDetailLink(item.id)}">Äá»c bÃ i viáº¿t</a>
      </div>
    `;
    return card;
  }

  function applyManagedText(content) {
    setText("brandEyebrow", content.brandEyebrow);
    setText("navAboutLabel", content.navAbout);
    setText("navRoomsLabel", content.navRooms);
    setText("navNewsLabel", content.navNews);
    setText("navAdminLabel", !content.navAdmin || content.navAdmin === "Admin" ? "ÄÄƒng nháº­p" : content.navAdmin);
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
