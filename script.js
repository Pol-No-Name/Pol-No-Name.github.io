const taskNameInput = document.getElementById("taskName");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filter-btn");
const filterContainer = document.querySelector(".filters");
const outline = document.querySelector(".outline");
const taskCategory = document.getElementById("taskCategory");

const colorPickerWrapper = document.getElementById("colorPickerWrapper");
const colorPicker = document.getElementById("categoryColorPicker");
const confirmColorBtn = document.getElementById("confirmColorBtn");

let tasks = [];
let activeFilter = "all";
let categoryChartInstance;
let categories = {
  None: "#7d7d7d",
};
let collapsedCategories = {};

let pendingCategory = null;
let draggedTaskIndex = null;

taskCategory.addEventListener("change", () => {
  if (taskCategory.value === "addNew") {
    let newCategory = prompt("Enter a new category name (10 letters max):");
    while (newCategory && newCategory.length > 10) {
      alert("Category name must be 10 characters or fewer. Please try again.");
      newCategory = prompt("Enter a new category name (10 letters max):");
    }

    if (newCategory) {
      pendingCategory = newCategory;
      colorPickerWrapper.style.display = "block";
    } else {
      taskCategory.value = "None";
    }
  }
});

confirmColorBtn.addEventListener("click", () => {
  if (pendingCategory) {
    const selectedColor = colorPicker.value || "#e0e0e0";

    categories[pendingCategory] = selectedColor;

    const newOption = document.createElement("option");
    newOption.value = pendingCategory;
    newOption.textContent = pendingCategory;
    taskCategory.insertBefore(newOption, taskCategory.lastElementChild);

    taskCategory.value = pendingCategory;

    pendingCategory = null;
    colorPickerWrapper.style.display = "none";

    saveCategories();
    renderCategoryChart();
    updateProgressBar();
  }
});

const progressBar = document.getElementById("progress");
const progressText = document.getElementById("progressText");

addTaskBtn.addEventListener("click", () => {
  const taskName = taskNameInput.value.trim();
  const taskCategoryValue = taskCategory.value;
  if (taskName) {
    tasks.push({
      name: taskName,
      completed: false,
      category: taskCategoryValue || "None",
    });
    taskNameInput.value = "";
    saveTasks();
    renderTasks(activeFilter);
    updateProgressBar();
    renderCategoryChart();
  }
});

function updateProgressBar() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  progressBar.style.width = `${progressPercentage}%`;
  progressText.textContent = `${Math.round(progressPercentage)}%`;

  progressBar.style.background =
    progressPercentage === 100
      ? "#36e072"
      : progressPercentage >= 80
      ? "#36e04d"
      : progressPercentage >= 60
      ? "#b0e036"
      : progressPercentage >= 40
      ? "#e0ca36"
      : progressPercentage >= 20
      ? "#e0a036"
      : progressPercentage >= 5
      ? "#e05836"
      : "#960909";
}

function loadTasks() {
  const storedTasks = localStorage.getItem("tasks");
  const storedCategories = localStorage.getItem("categories");

  if (storedTasks) tasks = JSON.parse(storedTasks);
  if (storedCategories) categories = JSON.parse(storedCategories);

  loadCategoriesToDropdown();
  renderTasks();
  updateProgressBar();
  renderCategoryChart();
  document
    .querySelector(".filter-btn[data-filter='all']")
    .classList.add("active");
}

function renderTasks(filter = activeFilter) {
  taskList.innerHTML = "";

  const groupedTasks = tasks.reduce((groups, task) => {
    if (
      filter === "all" ||
      (filter === "completed" && task.completed) ||
      (filter === "pending" && !task.completed)
    ) {
      if (!groups[task.category]) groups[task.category] = [];
      groups[task.category].push(task);
    }
    return groups;
  }, {});

  for (const [category, categoryTasks] of Object.entries(groupedTasks)) {
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    categoryHeader.style.backgroundColor = categories[category] || "#e0e0e0";
    categoryHeader.setAttribute("data-category", category);
    categoryHeader.setAttribute("ondragover", "allowDrop(event)");
    categoryHeader.setAttribute("ondrop", "dropToCategory(event)");
    categoryHeader.innerHTML = `
      <div class="category-header-content">
        <button class="toggle-btn">
          ${category} (${categoryTasks.length})
        </button>
        ${
          category !== "None"
            ? `<button class="delete-category-btn" onclick="deleteCategory('${category}')">Delete</button>`
            : ""
        }
      </div>
    `;

    categoryHeader.addEventListener("click", () => toggleCategory(category));

    taskList.appendChild(categoryHeader);

    const categoryContainer = document.createElement("ul");
    categoryContainer.className = "category-container";
    categoryContainer.id = `category-${category}`;

    if (collapsedCategories[category]) {
      categoryContainer.style.display = "none";
      categoryContainer.style.maxHeight = "0";
    } else {
      categoryContainer.style.display = "block";
      categoryContainer.style.maxHeight = "none";
    }

    categoryTasks.forEach((task, index) => {
      const originalIndex = tasks.indexOf(task);
      const li = document.createElement("li");
      li.className = `task-item ${task.completed ? "completed" : ""}`;
      li.setAttribute("draggable", "true");
      li.setAttribute("ondragstart", `drag(event, ${originalIndex})`);
      li.setAttribute("data-task-index", originalIndex);
      li.innerHTML = `
        <span>${task.name}</span>
        <div>
          <button 
            onclick="toggleTask(${originalIndex})" 
            class="complete-btn ${task.completed ? "undo-btn" : ""}">
            ${task.completed ? "Undo" : "Complete"}
          </button>
          <button 
            onclick="deleteTask(${originalIndex})" 
            class="delete-btn">
            Delete
          </button>
        </div>
      `;
      categoryContainer.appendChild(li);
    });
    taskList.appendChild(categoryContainer);
  }

  renderCategoryChart();
  updateProgressBar();
}

function deleteCategory(category) {
  tasks = tasks.map((task) =>
    task.category === category ? { ...task, category: "None" } : task
  );

  delete categories[category];

  const categoryOption = taskCategory.querySelector(
    `option[value="${category}"]`
  );
  if (categoryOption) categoryOption.remove();

  saveTasks();
  saveCategories();
  renderTasks(activeFilter);
  renderCategoryChart();
}

function drag(event, taskIndex) {
  draggedTaskIndex = taskIndex;
  event.dataTransfer.setData("text/plain", taskIndex);
}

function allowDrop(event) {
  event.preventDefault();
  const categoryHeader = event.target.closest(".category-header");
  if (categoryHeader) categoryHeader.classList.add("drag-over");
}

function dropToCategory(event) {
  event.preventDefault();
  const categoryHeader = event.target.closest(".category-header");
  if (categoryHeader) categoryHeader.classList.remove("drag-over");

  const newCategory = categoryHeader.dataset.category;
  if (draggedTaskIndex !== null && newCategory) {
    tasks[draggedTaskIndex].category = newCategory;

    saveTasks();
    renderTasks(activeFilter);
    renderCategoryChart();
    updateProgressBar();
  }

  draggedTaskIndex = null;
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks(activeFilter);
  renderCategoryChart();
  updateProgressBar();
}

function toggleCategory(category) {
  const categoryContainer = document.getElementById(`category-${category}`);
  if (categoryContainer) {
    const isCollapsed = categoryContainer.style.display === "none";

    if (isCollapsed) {
      categoryContainer.style.display = "block";
      categoryContainer.style.maxHeight = categoryContainer.scrollHeight + "px";
      collapsedCategories[category] = false;
    } else {
      categoryContainer.style.maxHeight = categoryContainer.scrollHeight + "px";
      setTimeout(() => {
        categoryContainer.style.maxHeight = "0";
      }, 10);

      setTimeout(() => {
        categoryContainer.style.display = "none";
      }, 300);
      collapsedCategories[category] = true;
    }
  }
}

function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks(activeFilter);
  renderCategoryChart();
  updateProgressBar();
}

function renderCategoryChart() {
  const categoryCounts = {};
  tasks.forEach((task) => {
    if (!task.completed) {
      categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
    }
  });

  const ctx = document.getElementById("categoryChart").getContext("2d");

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [
        {
          data: Object.values(categoryCounts),
          backgroundColor: Object.keys(categoryCounts).map(
            (category) => categories[category] || "#e0e0e0"
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
}

function loadTasks() {
  const storedTasks = localStorage.getItem("tasks");
  const storedCategories = localStorage.getItem("categories");

  if (storedTasks) tasks = JSON.parse(storedTasks);
  if (storedCategories) categories = JSON.parse(storedCategories);

  loadCategoriesToDropdown();
  renderTasks();
  renderCategoryChart();
  document
    .querySelector(".filter-btn[data-filter='all']")
    .classList.add("active");
}

function loadCategoriesToDropdown() {
  taskCategory.innerHTML = `
    <option value="None">None</option>
    <option value="addNew">Add New...</option>
  `;

  for (const [category, color] of Object.entries(categories)) {
    if (category !== "None") {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      taskCategory.insertBefore(option, taskCategory.lastElementChild);
    }
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    filterButtons.forEach((button) => button.classList.remove("active"));

    const target = event.target.closest(".filter-btn");
    if (target) {
      target.classList.add("active");

      activeFilter = target.dataset.filter;

      const buttonRect = target.getBoundingClientRect();
      const containerRect = filterContainer.getBoundingClientRect();

      outline.style.width = `${buttonRect.width}px`;
      outline.style.height = `${buttonRect.height}px`;
      outline.style.left = `${buttonRect.left - containerRect.left}px`;
      outline.style.top = `${buttonRect.top - containerRect.top}px`;

      renderTasks(activeFilter);
      updateProgressBar();
    }
  });
});

window.addEventListener("load", () => {
  loadTasks();

  const defaultButton = document.querySelector(
    ".filter-btn[data-filter='all']"
  );
  if (defaultButton) {
    defaultButton.classList.add("active");

    const buttonRect = defaultButton.getBoundingClientRect();
    const containerRect = filterContainer.getBoundingClientRect();

    outline.style.width = `${buttonRect.width}px`;
    outline.style.height = `${buttonRect.height}px`;
    outline.style.left = `${buttonRect.left - containerRect.left}px`;
    outline.style.top = `${buttonRect.top - containerRect.top}px`;
  }
});
