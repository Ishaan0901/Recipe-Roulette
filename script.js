document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // 🔗 DOM REFERENCES & CONSTANTS
  // ========================================
  const apiKey = "44f6694eb5774c9398e9f0bd431090b6";
  const searchBtn = document.getElementById("search-btn");
  const ingredientsInput = document.getElementById("ingredients");
  const recipeResults = document.getElementById("recipe-results");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.getElementById("modal-close");
  const loader = document.getElementById("loader");

  const openSavedBtn = document.getElementById("open-saved");
  const closeSavedBtn = document.getElementById("close-saved");
  const savedPanel = document.getElementById("saved-panel");
  const savedList = document.getElementById("saved-list");

  // ========================================
  // 🍳 LOADER LOGIC
  // ========================================
  function showLoader() {
    loader.classList.remove("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  // ========================================
  // 🥘 FETCH & DISPLAY RECIPES
  // ========================================
  async function fetchRecipes(ingredients) {
    showLoader();
    try {
      const res = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=5&apiKey=${apiKey}`);
      const data = await res.json();
      displayRecipes(data);
    } catch (error) {
      recipeResults.innerHTML = `<p class="error">⚠️ Failed to fetch recipes. Try again later.</p>`;
      console.error("Fetch error:", error);
    } finally {
      hideLoader();
    }
  }

  async function fetchRecipeDetails(recipeId) {
    try {
      const res = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`);
      const data = await res.json();

      const steps = data.analyzedInstructions?.[0]?.steps
        ?.map(step => `<li>${step.step}</li>`)
        .join("") || "<li>No instructions found.</li>";

      return {
        title: data.title,
        image: data.image,
        instructions: `<ol>${steps}</ol>`,
        video: data.sourceUrl ? `<a href="${data.sourceUrl}" target="_blank">Watch Full Recipe / Video</a>` : ""
      };
    } catch (error) {
      console.error("Recipe detail error:", error);
      return {
        title: "Unknown",
        instructions: "Failed to load instructions.",
        video: ""
      };
    }
  }

  async function displayRecipes(recipes) {
    recipeResults.innerHTML = "";

    if (!recipes || recipes.length === 0) {
      recipeResults.innerHTML = `<p class="not-found">No recipes found. Try different ingredients.</p>`;
      return;
    }

    for (const recipe of recipes) {
      const card = document.createElement("div");
      card.className = "recipe-card";

      const usedIngredients = recipe.usedIngredients?.map(i => i.name).join(", ") || "N/A";
      const missedIngredients = recipe.missedIngredients?.map(i => i.name).join(", ") || "N/A";

      card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.title}" />
        <div class="details">
          <h3>${recipe.title}</h3>
          <p><strong>Used:</strong> ${usedIngredients}</p>
          <p><strong>Missing:</strong> ${missedIngredients}</p>
        </div>
      `;

      // Heart Icon
      const heart = document.createElement("span");
      heart.className = "heart-icon";
      heart.innerHTML = isRecipeSaved(recipe.id) ? "❤️" : "🤍";

      heart.addEventListener("click", () => toggleFavorite(recipe, heart));

      // View Button
      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View Full Recipe";
      viewBtn.addEventListener("click", async () => {
        const details = await fetchRecipeDetails(recipe.id);
        showModal(details);
      });

      card.appendChild(heart);
      card.appendChild(viewBtn);
      recipeResults.appendChild(card);
    }
  }

  // ========================================
  // 🔍 SEARCH / CATEGORY
  // ========================================
  searchBtn.addEventListener("click", () => {
    const ingredients = ingredientsInput.value.trim();
    if (ingredients) fetchRecipes(ingredients);
    else alert("Please enter ingredients.");
  });

  document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
      const category = card.dataset.category;
      fetchRecipesByCategory(category);
    });
  });

  function fetchRecipesByCategory(category) {
    showLoader();
    const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&number=10&type=${category}`;
    fetch(url)
      .then(res => res.json())
      .then(data => displayRecipes(data.results))
      .catch(err => console.error("Category fetch error:", err))
      .finally(() => hideLoader());
  }

  // ========================================
  // ❤️ FAVORITE / SAVE TO LOCALSTORAGE
  // ========================================
  function isRecipeSaved(id) {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    return favorites.some(r => r.id === id);
  }

  function toggleFavorite(recipe, heartIcon) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const exists = favorites.some(r => r.id === recipe.id);

    if (exists) {
      favorites = favorites.filter(r => r.id !== recipe.id);
      heartIcon.innerHTML = "🤍";
    } else {
      favorites.push({ id: recipe.id, title: recipe.title, image: recipe.image });
      heartIcon.innerHTML = "❤️";
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
    heartIcon.classList.add("pulse");
    setTimeout(() => heartIcon.classList.remove("pulse"), 400);
    loadSavedRecipes();
  }

  // ========================================
  // 💾 SAVED RECIPES PANEL
  // ========================================
  openSavedBtn.addEventListener("click", () => {
    savedPanel.classList.add("show");
    loadSavedRecipes();
  });

  closeSavedBtn.addEventListener("click", () => {
    savedPanel.classList.remove("show");
  });

  function loadSavedRecipes() {
    savedList.innerHTML = "";
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    if (favorites.length === 0) {
      savedList.innerHTML = "<p>No saved recipes yet!</p>";
      return;
    }

    favorites.forEach(recipe => {
      const item = document.createElement("div");
      item.className = "saved-item";
      item.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.title}" />
        <h4>${recipe.title}</h4>
        <button data-id="${recipe.id}">Remove</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        removeFromFavorites(recipe.id);
        loadSavedRecipes();
      });
      savedList.appendChild(item);
    });
  }

  function removeFromFavorites(id) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(r => r.id !== id);
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }

  // ========================================
  // 🪟 MODAL LOGIC
  // ========================================
  function showModal({ title, image, instructions, video }) {
    modalContent.innerHTML = `
      <h2>${title}</h2>
      <img src="${image}" alt="${title}" style="max-width: 100%; border-radius: 10px;" />
      <h3>Instructions:</h3>
      ${instructions}
      <div class="video-link">${video}</div>
    `;
    modal.style.display = "block";
  }

  modalClose.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // ========================================
  // ❓ FAQ TOGGLE
  // ========================================
  document.querySelectorAll(".faq-item").forEach(item => {
    item.addEventListener("click", () => {
      item.classList.toggle("open");
      const sign = item.querySelector("span");
      sign.textContent = item.classList.contains("open") ? "−" : "+";
    });
  });

  // ========================================
  // ✨ GSAP ANIMATIONS
  // ========================================
  gsap.registerPlugin(ScrollTrigger);

  gsap.from("header", {
    y: -100,
    duration: 1,
    ease: "power4.out"
  });

  gsap.from(".home h1", {
    opacity: 0,
    y: 50,
    duration: 1,
    delay: 0.5
  });

  gsap.from(".home p", {
    opacity: 0,
    y: 30,
    duration: 1,
    delay: 1
  });

  gsap.utils.toArray("section").forEach(section => {
    gsap.from(section, {
      scrollTrigger: section,
      opacity: 0,
      y: 50,
      duration: 1,
      ease: "power2.out"
    });
  });

  // ========================================
  // 🎠 CAROUSEL
  // ========================================
  const topDishes = [
    {
      title: "Spaghetti Carbonara",
      img: "https://www.allrecipes.com/thmb/Vg2cRidr2zcYhWGvPD8M18xM_WY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/11973-spaghetti-carbonara-ii-DDMFS-4x3-6edea51e421e4457ac0c3269f3be5157.jpg",
      desc: "Classic Roman pasta with eggs, cheese, pancetta, and pepper."
    },
    {
      title: "Butter Chicken",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYU7bkgqtucD8ngwFxlIK-rDPzBR4k-ZIkTA&s",
      desc: "Creamy, rich Indian dish with marinated chicken and spices."
    },
    {
      title: "Sushi Platter",
      img: "https://i.redd.it/84obefjhqt6b1.jpg",
      desc: "Assorted rolls of fresh seafood and vegetables."
    },
    {
      title: "Beef Tacos",
      img: "https://www.onceuponachef.com/images/2023/08/Beef-Tacos.jpg",
      desc: "Spicy beef with crunchy shells, topped with salsa and cheese."
    },
    {
      title: "Pad Thai",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBMVQrh9CuD-sIeJ4p_kIWF0QffmqA8M557w&s",
      desc: "Stir-fried rice noodles with peanuts, shrimp, and lime."
    },
    {
      title: "Margherita Pizza",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP0HbRY0SsECXq3XHqjXUBw3CqK1VfE5PX1w&s",
      desc: "Thin crust pizza topped with tomato, basil, and mozzarella."
    },
    {
      title: "Falafel Wrap",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUr1aERmKOZfeUWsI17-x1eDGP--tBLXegog&s",
      desc: "Crispy chickpea balls with veggies in a pita wrap."
    },
    {
      title: "Chicken Biryani",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3TOQm3y314dluyVCBL9P9oNQlPSmltLp4lg&s",
      desc: "Spiced layered rice and chicken cooked to perfection."
    },
    {
      title: "Pho Noodle Soup",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjpo_F9xNUyXsfXHOk_w9qR-JW8FBmMNUzqA&s",
      desc: "Vietnamese soup with beef, herbs, and rice noodles."
    },
    {
      title: "Veggie Buddha Bowl",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXCw8yBK449eFyWYOFLXsdhQQZ_48o4EEuow&s",
      desc: "Colorful bowl of grains, veggies, and healthy toppings."
    }
  ];

  const track = document.querySelector(".carousel-track");

  topDishes.forEach(dish => {
    const card = document.createElement("div");
    card.className = "carousel-card";
    card.innerHTML = `
      <img src="${dish.img}" alt="${dish.title}" />
      <h3>${dish.title}</h3>
      <p>${dish.desc}</p>
    `;
    track.appendChild(card);
  });

  let currentSlide = 0;
  let autoplay;

  function startAutoplay() {
    autoplay = setInterval(() => {
      const cards = document.querySelectorAll(".carousel-card");
      currentSlide = (currentSlide + 1) % cards.length;
      track.style.transform = `translateX(-${currentSlide * (cards[0].offsetWidth + 30)}px)`;
    }, 3000);
  }

  function stopAutoplay() {
    clearInterval(autoplay);
  }

  startAutoplay();

  const carouselContainer = document.querySelector(".carousel-container");
  carouselContainer.addEventListener("mouseenter", stopAutoplay);
  carouselContainer.addEventListener("mouseleave", startAutoplay);

  document.querySelector(".carousel-btn.next").addEventListener("click", () => {
    const cards = document.querySelectorAll(".carousel-card");
    currentSlide = Math.min(currentSlide + 1, cards.length - 1);
    track.style.transform = `translateX(-${currentSlide * (cards[0].offsetWidth + 30)}px)`;
  });

  document.querySelector(".carousel-btn.prev").addEventListener("click", () => {
    currentSlide = Math.max(currentSlide - 1, 0);
    track.style.transform = `translateX(-${currentSlide * (track.children[0].offsetWidth + 30)}px)`;
  });
});
