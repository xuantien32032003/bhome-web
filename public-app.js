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
    document.getElementById("vacantCount").textContent = String(state.rooms.filter((room) => room.status === "available").length).padStart(2, "0");
    document.getElementById("heroBadgeText").textContent = `${state.buildings.length} toa nha dang van hanh va ${state.rooms.length} phong trong danh muc.`;

    const statTemplate = document.getElementById("statCardTemplate");
    const statGrid = document.getElementById("investorStats");
    state.investorStats.forEach((stat) => {
      const fragment = statTemplate.content.cloneNode(true);
      fragment.querySelector(".stat-label").textContent = stat.label;
      fragment.querySelector(".stat-value").textContent = stat.value;
      fragment.querySelector(".stat-note").textContent = stat.note;
      statGrid.appendChild(fragment);
    });

    const resultsGrid = document.getElementById("resultsGrid");
    state.results.forEach((result) => {
      const card = document.createElement("article");
      card.className = "results-card";
      card.innerHTML = `<h3>${result.title}</h3><p>${result.description}</p>`;
      resultsGrid.appendChild(card);
    });

    const buildingGrid = document.getElementById("homeBuildingGrid");
    state.buildings.forEach((building) => {
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
            <div><strong>Khu vuc:</strong> ${building.region}</div>
            <div><strong>So phong:</strong> ${roomCount}</div>
            <div><strong>Lap day:</strong> ${building.occupancy}%</div>
          </div>
          <a class="primary-button button-inline" href="${buildingDetailLink(building.id)}">Xem chi tiet</a>
        </div>
      `;
      buildingGrid.appendChild(card);
    });
  }

  function renderBuildingDetailPage(state) {
    const params = new URLSearchParams(window.location.search);
    const building = getBuildingById(state, params.get("id"));
    if (!building) {
      document.getElementById("detailPageTitle").textContent = "Khong tim thay toa nha";
      document.getElementById("detailPageSummary").textContent = "Du lieu toa nha khong ton tai hoac da bi xoa.";
      document.getElementById("detailContentGrid").innerHTML = '<div class="empty-state-card">Khong co noi dung de hien thi.</div>';
      return;
    }

    document.title = `${building.name} | Chi tiet toa nha`;
    document.getElementById("detailPageTitle").textContent = building.name;
    document.getElementById("detailPageSummary").textContent = building.description;
    document.getElementById("detailMainImage").src = safeImage(building.image, FALLBACK_BUILDING_IMAGE);

    const thumbGrid = document.getElementById("detailThumbGrid");
    (building.gallery && building.gallery.length ? building.gallery : [building.image]).forEach((image) => {
      const img = document.createElement("img");
      img.src = safeImage(image, FALLBACK_BUILDING_IMAGE);
      img.alt = building.name;
      thumbGrid.appendChild(img);
    });

    const rooms = getRoomsByBuilding(state, building.id);
    document.getElementById("detailContentGrid").innerHTML = `
      <article class="detail-info-card">
        <h3>Thong tin van hanh</h3>
        <ul class="detail-list">
          <li><span>Khu vuc</span><strong>${building.region}</strong></li>
          <li><span>Dia chi</span><strong>${building.address}</strong></li>
          <li><span>So tang</span><strong>${building.floors}</strong></li>
          <li><span>Gia trung binh</span><strong>${building.averageRent}</strong></li>
        </ul>
      </article>
      <article class="detail-info-card">
        <h3>Goc nhin dau tu</h3>
        <ul class="detail-list">
          <li><span>Ty le lap day</span><strong>${building.occupancy}%</strong></li>
          <li><span>Diem nhan</span><strong>${building.investmentHighlight}</strong></li>
          <li><span>Tong phong</span><strong>${rooms.length}</strong></li>
          <li><span>Phong dang trong</span><strong>${rooms.filter((room) => room.status === "available").length}</strong></li>
        </ul>
      </article>
    `;

    const grid = document.getElementById("detailRoomsGrid");
    if (!rooms.length) {
      grid.innerHTML = '<div class="empty-state-card">Chua co phong nao duoc cap nhat.</div>';
      return;
    }
    rooms.forEach((room) => grid.appendChild(roomCard(room, building.name)));
  }

  function renderRoomsPage(state) {
    const regionFilter = document.getElementById("regionFilter");
    const buildingFilter = document.getElementById("buildingFilter");
    const statusFilter = document.getElementById("statusFilter");
    const grid = document.getElementById("roomsPageGrid");

    fillSelect(regionFilter, ["Tat ca khu vuc"].concat(unique(state.rooms.map((room) => room.region))));
    fillSelect(buildingFilter, ["Tat ca toa nha"].concat(state.buildings.map((building) => building.name)));
    fillSelect(statusFilter, ["Tat ca trang thai", "Dang trong", "Da co khach", "Sap trong"]);

    [regionFilter, buildingFilter, statusFilter].forEach((select) => select.addEventListener("change", render));
    render();

    function render() {
      grid.innerHTML = "";
      const filtered = state.rooms.filter((room) => {
        const building = getBuildingById(state, room.buildingId);
        const regionMatch = regionFilter.value === "Tat ca khu vuc" || room.region === regionFilter.value;
        const buildingMatch = buildingFilter.value === "Tat ca toa nha" || (building && building.name === buildingFilter.value);
        const statusMatch = statusFilter.value === "Tat ca trang thai" || statusLabel(room.status) === statusFilter.value;
        return regionMatch && buildingMatch && statusMatch;
      });

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state-card">Khong co phong phu hop voi bo loc hien tai.</div>';
        return;
      }

      filtered.forEach((room) => {
        const building = getBuildingById(state, room.buildingId);
        grid.appendChild(roomCard(room, building ? building.name : "Khong xac dinh"));
      });
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
    card.className = "room-card";
    card.innerHTML = `
      <div class="room-visual">
        <img src="${safeImage(room.image, FALLBACK_ROOM_IMAGE)}" alt="${room.name}">
      </div>
      <span class="status-pill status-${room.status}">${statusLabel(room.status)}</span>
      <h3>${room.name}</h3>
      <p>${buildingName} | ${room.type}</p>
      <div class="room-meta">
        <div><strong>Khu vuc:</strong> ${room.region}</div>
        <div><strong>Gia thue:</strong> ${room.rent}</div>
        <div><strong>Ngay trong:</strong> ${formatDate(room.availableFrom)}</div>
        <div><strong>Dien tich:</strong> ${room.area}</div>
        <div><strong>Tien ich:</strong> ${room.amenities}</div>
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
