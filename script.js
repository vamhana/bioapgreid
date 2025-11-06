// Навигация по закладкам
document.addEventListener('DOMContentLoaded', function() {
    const bookmarks = document.querySelectorAll('.bookmark');
    const pages = document.querySelectorAll('.page');
    
    // Функция переключения страниц
    function switchPage(targetPageId) {
        // Убираем активный класс у всех закладок и страниц
        bookmarks.forEach(b => b.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        
        // Добавляем активный класс текущей закладке и странице
        const activeBookmark = document.querySelector(`[data-page="${targetPageId}"]`);
        const activePage = document.getElementById(targetPageId);
        
        if (activeBookmark && activePage) {
            activeBookmark.classList.add('active');
            activePage.classList.add('active');
            
            // Прокрутка к верху страницы
            document.querySelector('.book-content').scrollTop = 0;
        }
    }
    
    // Обработчики для закладок
    bookmarks.forEach(bookmark => {
        bookmark.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            switchPage(targetPage);
        });
    });
    
    // Обработка хеша в URL (для глубоких ссылок)
    function handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            switchPage(hash);
        }
    }
    
    // Слушаем изменения хеша
    window.addEventListener('hashchange', handleHashChange);
    
    // Проверяем хеш при загрузке
    handleHashChange();
    
    // Добавляем плавную прокрутку
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Дополнительные функции для будущего расширения
const BookApp = {
    // Сохранение состояния
    saveState: function() {
        const activePage = document.querySelector('.page.active').id;
        localStorage.setItem('bookActivePage', activePage);
    },
    
    // Восстановление состояния
    restoreState: function() {
        const savedPage = localStorage.getItem('bookActivePage');
        if (savedPage) {
            const bookmark = document.querySelector(`[data-page="${savedPage}"]`);
            if (bookmark) {
                bookmark.click();
            }
        }
    },
    
    // Поиск по контенту (будет реализовано позже)
    initSearch: function() {
        console.log('Поиск будет реализован после добавления контента');
    }
};

// Инициализация дополнительных функций при загрузке
document.addEventListener('DOMContentLoaded', function() {
    BookApp.restoreState();
    
    // Сохраняем состояние при переключении страниц
    document.querySelectorAll('.bookmark').forEach(bookmark => {
        bookmark.addEventListener('click', BookApp.saveState);
    });
});
