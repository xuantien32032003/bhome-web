(function () {
  const {
    FALLBACK_BUILDING_IMAGE,
    FALLBACK_ROOM_IMAGE,
    buildingDetailLink,
    formatDate,
    getBuildingById,
    getRoomsByBuilding,
    loadState,
    safeImage,
    statusLabel,
  } = window.NovaData;

  const page = document.body.dataset.page;
  const BUILDINGS_PER_PAGE = 3;
  const ROOMS_PER_PAGE = 10;

  init();

  async function init() {
    const state = await loadState();
    setupCommon(state);
    if (page === "home") renderHome(state);
    if (page === "building-detail") renderBuildingDetailPage(state);
    if (page === "rooms") renderRoomsPage(state);
  }

  function setupCommon(state) {
    applyManagedText(state.content);

    const companyName = document.getElementById("companyName");
    if (companyName) companyName.textContent = state.company.name;
    applyBrand(state.company, state.content);

    const toggle = document.getElementById("contactToggle");
    const card = document.getElementById("contactCard");
    if (toggle && card) toggle.addEventListener("click", () => card.classList.toggle("hidden"));

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
      const currentItems = state.buildings.slice(start, start + BUILDINGS_PER_PAGE);

      currentItems.forEach((building) => {
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
    document.getElementById("detailMainImage").src = safeImage(building.image, FALLBACK_BUILDING_IMAGE);

    const thumbGrid = document.getElementById("detailThumbGrid");
    thumbGrid.innerHTML = "";
    (building.gallery && building.gallery.length ? building.gallery : [building.image]).forEach((image) => {
      const img = document.createElement("img");
      img.src = safeImage(image, FALLBACK_BUILDING_IMAGE);
      img.alt = building.name;
      thumbGrid.appendChild(img);
    });

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
        <div><strong>Diện tích:</strong> ${room.area}</div>
        <div><strong>Tiện ích:</strong> ${room.amenities}</div>
      </div>
    `;
    return card;
  }

  function applyManagedText(content) {
    setText("brandEyebrow", content.brandEyebrow);
    setText("navAboutLabel", content.navAbout);
    setText("navRoomsLabel", content.navRooms);
    setText("navAdminLabel", content.navAdmin);
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
    setText("contactToggle", content.contactToggle);
    setText("contactTitle", content.contactTitle);
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
})();
