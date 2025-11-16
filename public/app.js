// API 설정
const API_BASE = 'http://localhost:3001/api/auth';
const USER_API = 'http://localhost:3002/api/user';
const ASSIGNMENT_API = 'http://localhost:3003/api/assignment';

// 상태 관리
let currentUser = null;
let currentToken = null;
let classes = [];
let students = [];
let teachers = [];
let assignments = [];
let currentClassroom = null;
let announcements = [];
let isAdminPortal = false; // admin 포털 여부

// 페이지네이션 상태
let currentStudentPage = 1;
let currentTeacherPage = 1;
const itemsPerPage = 20;

// 현재 선택된 학생/교사 ID
let selectedStudentId = null;
let selectedTeacherId = null;

// 정렬 상태
let studentSortColumn = null;
let studentSortOrder = 'asc';
let teacherSortColumn = null;
let teacherSortOrder = 'asc';

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    checkIfAdminPortal();
    checkAuth();
    setupEventListeners();
});

// Admin 포털 체크
function checkIfAdminPortal() {
    const host = window.location.host;
    isAdminPortal = host.startsWith('admin.');
    console.log('Is Admin Portal:', isAdminPortal);
    
    // Admin 포털에서는 admin.html로 리디렉션 (로그인 페이지 제외)
    if (isAdminPortal && !window.location.pathname.includes('admin.html') && !window.location.pathname.includes('test.html')) {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        // 로그인되어 있으면 admin.html로 리디렉션
        if (token && user) {
            const userData = JSON.parse(user);
            if (userData.role === 'superadmin') {
                window.location.href = '/admin.html';
                return;
            }
        }
        // 로그인 안되어 있으면 test.html로 리디렉션
        else {
            window.location.href = '/test.html';
            return;
        }
    }
    
    // Admin 포털이 아니면 슈퍼어드민 로그인 불가
    if (!isAdminPortal) {
        // 나중에 로그인 후 슈퍼어드민 메뉴도 숨김
    }
}

// 인증 확인
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        
        // Admin 포털이 아닌데 슈퍼어드민이면 로그아웃
        if (!isAdminPortal && currentUser.role === 'superadmin') {
            alert('슈퍼어드민은 admin.localhost:3001 에서만 접속 가능합니다.');
            logout();
            return;
        }
        
        // Admin 포털인데 슈퍼어드민이 아니면 로그아웃
        if (isAdminPortal && currentUser.role !== 'superadmin') {
            alert('일반 사용자는 학교별 도메인으로 접속해주세요.');
            logout();
            return;
        }
        
        showDashboard();
    } else {
        showLoginPage();
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 로그인 폼
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // 클래스 생성 폼
    document.getElementById('create-class-form').addEventListener('submit', handleCreateClass);
    
    // 학생 추가 폼
    document.getElementById('add-student-form').addEventListener('submit', handleAddStudent);
    
    // CSV 업로드 폼
    document.getElementById('upload-csv-form').addEventListener('submit', handleUploadCSV);
    
    // 공지사항 폼
    document.getElementById('announcement-form').addEventListener('submit', handlePostAnnouncement);
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    showLoading(true);
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            currentToken = data.data.accessToken;
            currentUser = data.data.user;
            
            // Admin 포털 접근 제어
            if (isAdminPortal && currentUser.role !== 'superadmin') {
                showMessage('슈퍼어드민만 접속 가능합니다.', 'error');
                return;
            }
            
            if (!isAdminPortal && currentUser.role === 'superadmin') {
                showMessage('슈퍼어드민은 admin.localhost:3001 에서만 접속 가능합니다.', 'error');
                return;
            }
            
            localStorage.setItem('token', currentToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // 학교별 도메인으로 리다이렉트 (슈퍼어드민 제외)
            if (currentUser.role !== 'superadmin' && currentUser.schoolId) {
                const currentHost = window.location.hostname;
                const schoolSubdomain = `${currentUser.schoolId}.${currentHost.replace(/^[^.]+\./, '')}`;
                
                // 이미 올바른 도메인에 있는지 확인
                if (!currentHost.startsWith(currentUser.schoolId)) {
                    // 학교 도메인으로 리다이렉트
                    window.location.href = `http://${currentUser.schoolId}.localhost:3001`;
                    return;
                }
            }
            
            // 비밀번호 변경 필요 여부 확인
            if (data.data.requirePasswordChange) {
                showMessage('보안을 위해 첫 로그인 시 비밀번호를 변경해주세요.', 'warning');
                setTimeout(() => {
                    showPasswordChangeModal();
                }, 1000);
            }
            
            showDashboard();
        } else {
            showMessage(data.message || '로그인에 실패했습니다', 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 대시보드 표시
function showDashboard() {
    // 슈퍼어드민은 admin.html로 리디렉션
    if (currentUser.role === 'superadmin') {
        window.location.href = '/admin.html';
        return;
    }
    
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('school-name').textContent = currentUser.schoolId || 'FairSchool';
    
    // 역할에 따른 UI 조정
    setupRoleBasedUI();
    
    loadClasses();
}

// 역할 기반 UI 설정
function setupRoleBasedUI() {
    const role = currentUser.role;
    
    // 탭 네비게이션
    const tabNavigation = document.querySelector('.tab-navigation');
    
    if (role === 'student') {
        // 학생용 UI
        tabNavigation.innerHTML = `
            <button class="tab-item active" onclick="showSection('my-classes')">
                📚 내 클래스
            </button>
            <button class="tab-item" onclick="showSection('my-assignments')">
                📝 내 과제
            </button>
        `;
        
        // 학생용 섹션만 표시
        document.getElementById('classes-section').style.display = 'none';
        document.getElementById('students-section').style.display = 'none';
        document.getElementById('teachers-section').style.display = 'none';
        document.getElementById('assignments-section').style.display = 'none';
        
    } else if (role === 'teacher') {
        // 교사용 UI
        tabNavigation.innerHTML = `
            <button class="tab-item active" onclick="showSection('classes')">
                📚 내 클래스
            </button>
            <button class="tab-item" onclick="showSection('assignments')">
                📝 과제 관리
            </button>
        `;
        
        // 학생 관리와 교사 관리 섹션 숨기기
        document.getElementById('students-section').style.display = 'none';
        document.getElementById('teachers-section').style.display = 'none';
        
    } else if (role === 'admin') {
        // 학교 관리자용 UI (과제 제외)
        tabNavigation.innerHTML = `
            <button class="tab-item active" onclick="showSection('classes')">
                📚 클래스
            </button>
            <button class="tab-item" onclick="showSection('students')">
                👥 학생
            </button>
            <button class="tab-item" onclick="showSection('teachers')">
                👨‍🏫 교사
            </button>
        `;
        
        // 과제 섹션 숨기기
        document.getElementById('assignments-section').style.display = 'none';
    }
}

// 로그인 페이지 표시
function showLoginPage() {
    document.getElementById('dashboard-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
    
    // Admin 포털 여부에 따라 메시지 변경
    const portalInfo = document.getElementById('portal-info');
    const footerMessage = document.getElementById('footer-message');
    
    if (isAdminPortal) {
        portalInfo.style.display = 'block';
        footerMessage.textContent = '슈퍼어드민만 접속 가능합니다.';
    } else {
        portalInfo.style.display = 'none';
        footerMessage.textContent = '학교 등록은 admin.localhost:3001 에서 가능합니다.';
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentToken = null;
    currentUser = null;
    showLoginPage();
}

// 섹션 전환
function showSection(section) {
    const sections = document.querySelectorAll('.section');
    const tabItems = document.querySelectorAll('.tab-item');
    
    sections.forEach(s => s.classList.remove('active'));
    tabItems.forEach(t => t.classList.remove('active'));
    
    // 역할에 따른 섹션 표시
    const role = currentUser.role;
    
    if (role === 'superadmin') {
        // 슈퍼어드민용 섹션
        document.getElementById(`${section}-section`).classList.add('active');
        
        if (section === 'schools') {
            loadSchools();
        } else if (section === 'stats') {
            loadSystemStats();
        }
    } else if (role === 'student') {
        // 학생용 섹션
        if (section === 'my-classes') {
            document.getElementById('classes-section').style.display = 'block';
            document.getElementById('classes-section').classList.add('active');
            loadMyClasses();
        } else if (section === 'my-assignments') {
            document.getElementById('assignments-section').style.display = 'block';
            document.getElementById('assignments-section').classList.add('active');
            loadMyAssignments();
        }
    } else {
        // 교사/관리자용 섹션
        document.getElementById(`${section}-section`).classList.add('active');
        
        if (section === 'classes') {
            loadClasses();
        } else if (section === 'students') {
            loadStudents();
        } else if (section === 'teachers') {
            loadTeachers();
        } else if (section === 'assignments') {
            loadAssignments();
        }
    }
    
    // 클릭한 탭 활성화
    event.target.classList.add('active');
}

// 클래스 목록 로드
async function loadClasses() {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/classes`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            classes = data.data;
            renderClasses();
        }
    } catch (error) {
        console.error('클래스 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 클래스 렌더링
function renderClasses() {
    const container = document.getElementById('classes-list');
    
    if (classes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 생성된 클래스가 없습니다.</p>';
        return;
    }
    
    const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'admin';
    
    container.innerHTML = classes.map(cls => `
        <div class="class-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3 style="margin: 0; flex: 1;">${cls.name}</h3>
                ${isTeacher ? `
                    <div class="dropdown" style="position: relative;">
                        <button onclick="toggleClassMenu(event, '${cls._id}')" class="btn-icon" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 8px;">⋮</button>
                        <div id="class-menu-${cls._id}" class="dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); min-width: 120px; z-index: 100;">
                            <button onclick="editClass('${cls._id}')" style="display: block; width: 100%; padding: 8px 16px; border: none; background: none; text-align: left; cursor: pointer; border-bottom: 1px solid #eee;">수정</button>
                            <button onclick="deleteClass('${cls._id}')" style="display: block; width: 100%; padding: 8px 16px; border: none; background: none; text-align: left; cursor: pointer; color: #dc3545;">삭제</button>
                        </div>
                    </div>
                ` : ''}
            </div>
            ${cls.description ? `<p style="color: #666; margin-top: 8px;">${cls.description}</p>` : ''}
            <p style="background: #f0f0f0; padding: 5px; border-radius: 4px; font-weight: bold; text-align: center; margin: 10px 0;">
                클래스 코드: ${cls.classCode || 'N/A'}
            </p>
            <div class="stats">
                <div class="stat">
                    <span>👥</span>
                    <span>${cls.studentIds?.length || 0}명</span>
                </div>
                <div class="stat">
                    <span>📝</span>
                    <span>${cls.assignmentCount || 0}개</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 클래스 메뉴 토글
function toggleClassMenu(event, classId) {
    event.stopPropagation();
    const menu = document.getElementById(`class-menu-${classId}`);
    
    // 다른 메뉴 닫기
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `class-menu-${classId}`) {
            m.style.display = 'none';
        }
    });
    
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// 클래스 수정
function editClass(classId) {
    const cls = classes.find(c => c._id === classId);
    if (!cls) return;
    
    // TODO: 수정 모달 구현
    alert('클래스 수정 기능은 곧 제공됩니다.');
}

// 클래스 삭제
async function deleteClass(classId) {
    if (!confirm('정말 이 클래스를 삭제하시겠습니까?\n삭제 시 관련 과제도 함께 삭제됩니다.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/classes/${classId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('클래스가 삭제되었습니다.', 'success');
            loadClasses();
        } else {
            alert(data.message || '클래스 삭제에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});

// 학생 목록 로드
async function loadStudents() {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/students`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            students = data.data;
            renderStudents();
        }
    } catch (error) {
        console.error('학생 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 학생 렌더링
function renderStudents() {
    const container = document.getElementById('students-list');
    const searchQuery = document.getElementById('student-search')?.value?.toLowerCase() || '';
    const gradeFilter = document.getElementById('student-grade-filter')?.value || '';
    const classFilter = document.getElementById('student-class-filter')?.value || '';
    
    // 검색 및 필터링
    let filteredStudents = students.filter(student => {
        const matchSearch = !searchQuery || 
            student.name.toLowerCase().includes(searchQuery) ||
            (student.studentNumber && student.studentNumber.includes(searchQuery));
        
        const matchGrade = !gradeFilter || student.grade == gradeFilter;
        const matchClass = !classFilter || student.classNum == classFilter;
        
        return matchSearch && matchGrade && matchClass;
    });
    
    // 정렬
    if (studentSortColumn) {
        filteredStudents.sort((a, b) => {
            let aVal = a[studentSortColumn] || '';
            let bVal = b[studentSortColumn] || '';
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return studentSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return studentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // 페이지네이션
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIdx = (currentStudentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIdx, endIdx);
    
    if (filteredStudents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">검색 결과가 없습니다.</p>';
        document.getElementById('student-pagination').innerHTML = '';
        return;
    }
    
    const getSortIcon = (column) => {
        if (studentSortColumn !== column) return ' ↕';
        return studentSortOrder === 'asc' ? ' ↑' : ' ↓';
    };
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="select-all-students" onchange="toggleSelectAllStudents(this.checked)">
                    </th>
                    <th style="cursor: pointer;" onclick="sortStudents('name')">이름${getSortIcon('name')}</th>
                    <th style="cursor: pointer;" onclick="sortStudents('studentNumber')">학번${getSortIcon('studentNumber')}</th>
                    <th style="cursor: pointer;" onclick="sortStudents('email')">이메일${getSortIcon('email')}</th>
                    <th style="cursor: pointer;" onclick="sortStudents('grade')">학년-반${getSortIcon('grade')}</th>
                    <th>클래스</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedStudents.map(student => `
                    <tr>
                        <td>
                            <input type="checkbox" class="student-checkbox" value="${student._id}">
                        </td>
                        <td><a href="#" onclick="showStudentDetail('${student._id}'); return false;" style="color: #667eea; text-decoration: none; font-weight: 500;">${student.name}</a></td>
                        <td>${student.studentNumber || '-'}</td>
                        <td>${student.email}</td>
                        <td>${student.grade || '-'}학년 ${student.classNum || '-'}반</td>
                        <td>${student.className || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // 페이지네이션 렌더링
    renderPagination('student-pagination', currentStudentPage, totalPages, (page) => {
        currentStudentPage = page;
        renderStudents();
    });
}

// 과제 목록 로드
async function loadAssignments() {
    showLoading(true);
    
    try {
        const response = await fetch(`${ASSIGNMENT_API}/assignments`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            assignments = data.data;
            renderAssignments();
        }
    } catch (error) {
        console.error('과제 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 과제 렌더링
function renderAssignments() {
    const container = document.getElementById('assignments-list');
    
    if (assignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 생성된 과제가 없습니다.</p>';
        return;
    }
    
    const isStudent = currentUser.role === 'student';
    
    container.innerHTML = assignments.map(assignment => `
        <div class="class-card">
            <h3>${assignment.title}</h3>
            <p>${assignment.description}</p>
            <div class="stats">
                <div class="stat">
                    <span>📅</span>
                    <span>마감: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
                </div>
                <div class="stat">
                    <span>📊</span>
                    <span>${assignment.submissionCount || 0}/${assignment.totalStudents || 0} 제출</span>
                </div>
            </div>
            ${isStudent ? `
                <button class="btn btn-primary btn-sm" onclick='openSubmitAssignmentModal(${JSON.stringify(assignment).replace(/'/g, "\\'")})'
                        style="margin-top: 10px;">
                    과제 제출
                </button>
            ` : `
                <button class="btn btn-primary btn-sm" onclick="loadAssignmentDetail('${assignment._id}')"
                        style="margin-top: 10px;">
                    제출 목록 보기
                </button>
            `}
        </div>
    `).join('');
}

// 클래스 생성 모달 열기
// 클래스 생성 모달 전역 변수
let allClassStudents = [];
let filteredClassStudents = [];

async function openCreateClassModal() {
    // 학생 목록 로드
    if (students.length === 0) {
        await loadStudents();
    }
    
    allClassStudents = [...students];
    filteredClassStudents = [...students];
    
    // 필터 초기화
    document.getElementById('class-student-grade-filter').value = '';
    document.getElementById('class-student-classnum-filter').value = '';
    document.getElementById('class-student-search').value = '';
    document.getElementById('select-all-students').checked = false;
    
    renderClassStudentList();
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('create-class-modal').classList.add('active');
}

// 학생 목록 렌더링
function renderClassStudentList() {
    const container = document.getElementById('class-student-list');
    
    if (filteredClassStudents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">검색 결과가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = filteredClassStudents.map(student => `
        <label style="display: block; padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; background-color: white; margin-bottom: 2px;">
            <input type="checkbox" class="class-student-checkbox" value="${student._id}" style="margin-right: 8px;">
            <span style="font-weight: 500;">${student.name}</span>
            <span style="color: #666; margin-left: 10px;">학번: ${student.studentNumber || 'N/A'}</span>
            <span style="color: #999; margin-left: 10px; font-size: 12px;">${student.grade || '?'}학년 ${student.classNum || '?'}반</span>
        </label>
    `).join('');
}

// 학생 필터링
function filterClassStudents() {
    const gradeFilter = document.getElementById('class-student-grade-filter').value;
    const classNumFilter = document.getElementById('class-student-classnum-filter').value;
    const searchText = document.getElementById('class-student-search').value.toLowerCase();
    
    filteredClassStudents = allClassStudents.filter(student => {
        const matchGrade = !gradeFilter || student.grade == gradeFilter;
        const matchClass = !classNumFilter || student.classNum == classNumFilter;
        const matchSearch = !searchText || 
            student.name.toLowerCase().includes(searchText) ||
            (student.studentNumber && student.studentNumber.includes(searchText));
        
        return matchGrade && matchClass && matchSearch;
    });
    
    renderClassStudentList();
    document.getElementById('select-all-students').checked = false;
}

// 전체 선택/해제
function toggleAllStudents(checked) {
    const checkboxes = document.querySelectorAll('.class-student-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

// 학생 추가 모달 열기
async function openAddStudentModal() {
    // 클래스 목록을 셀렉트박스에 로드
    const select = document.getElementById('student-class');
    select.innerHTML = '<option value="">클래스를 선택하세요</option>' + 
        classes.map(cls => `<option value="${cls._id}">${cls.name}</option>`).join('');
    
    // 폼 초기화
    document.getElementById('add-student-form').reset();
    document.getElementById('student-number').value = '';
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('add-student-modal').classList.add('active');
}

// 학번 자동생성 함수
function generateStudentNumber() {
    const grade = document.getElementById('student-grade').value;
    const classNum = document.getElementById('student-class-num').value;
    const number = document.getElementById('student-number-input').value;
    
    if (grade && classNum && number) {
        // 학번 형식: 학년(1자리) + 반(2자리) + 번호(2자리) 예: 10101 = 1학년 1반 1번
        const studentNumber = grade + classNum.padStart(2, '0') + number.padStart(2, '0');
        document.getElementById('student-number').value = studentNumber;
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// 클래스 생성 처리
async function handleCreateClass(e) {
    e.preventDefault();
    showLoading(true);
    
    const name = document.getElementById('class-name').value;
    const description = document.getElementById('class-description').value || '';
    
    // 선택된 학생 ID 수집
    const selectedCheckboxes = document.querySelectorAll('.class-student-checkbox:checked');
    const studentIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    try {
        const response = await fetch(`${USER_API}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, description, studentIds })
        });
        
        const data = await response.json();
        
        console.log('Class creation response:', data);
        
        if (response.ok) {
            closeModal();
            loadClasses();
            e.target.reset();
            showMessage(`과목이 생성되었습니다. 클래스 코드: ${data.data.classCode}`, 'success');
        } else {
            alert(data.message || '과목 생성에 실패했습니다');
        }
    } catch (error) {
        console.error('Class creation error:', error);
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 학생 추가 처리
async function handleAddStudent(e) {
    e.preventDefault();
    
    // 에러 메시지 초기화
    clearFormErrors('student');
    
    showLoading(true);
    
    const name = document.getElementById('student-name').value;
    const email = document.getElementById('student-email').value;
    const password = document.getElementById('student-password').value;
    const grade = document.getElementById('student-grade').value;
    const classNum = document.getElementById('student-class-num').value;
    const number = document.getElementById('student-number-input').value;
    const studentNumber = document.getElementById('student-number').value;
    const classId = document.getElementById('student-class').value;
    
    // 학번 검증
    if (!studentNumber) {
        showFieldError('student-grade', '학년, 반, 번호를 모두 입력해주세요');
        showLoading(false);
        return;
    }
    
    try {
        const response = await fetch(`${USER_API}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                name, 
                email, 
                password,
                grade: parseInt(grade),
                classNum: parseInt(classNum),
                number: parseInt(number),
                enrollmentYear: new Date().getFullYear(),
                classId: classId || undefined 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadStudents();
            e.target.reset();
            document.getElementById('student-number').value = '';
            showMessage('학생이 추가되었습니다', 'success');
        } else {
            // 에러 메시지 파싱 및 표시
            if (data.message) {
                if (data.message.includes('이메일')) {
                    showFieldError('student-email', data.message);
                } else if (data.message.includes('학번')) {
                    showFieldError('student-number', data.message);
                } else {
                    alert(data.message);
                }
            } else {
                alert('학생 추가에 실패했습니다');
            }
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 폼 에러 표시
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    if (inputElement) {
        inputElement.classList.add('error');
    }
}

// 폼 에러 초기화
function clearFormErrors(prefix) {
    const errorElements = document.querySelectorAll(`[id^="${prefix}-"][id$="-error"]`);
    errorElements.forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
    });
    
    const inputElements = document.querySelectorAll(`[id^="${prefix}-"]`);
    inputElements.forEach(el => {
        el.classList.remove('error');
    });
}


// CSV 다운로드
async function downloadCSV() {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/students/export/csv`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('CSV 파일이 다운로드되었습니다', 'success');
        } else {
            const data = await response.json();
            alert(data.message || 'CSV 다운로드에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// CSV 업로드 모달 열기
function openUploadCSVModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('upload-csv-modal').classList.add('active');
}

// CSV 업로드 처리
async function handleUploadCSV(e) {
    e.preventDefault();
    showLoading(true);
    
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요');
        showLoading(false);
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${USER_API}/students/import/csv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadStudents();
            e.target.reset();
            
            const message = `CSV 업로드 완료\n성공: ${data.data.success}명\n실패: ${data.data.failed}명`;
            if (data.data.errors && data.data.errors.length > 0) {
                const errorDetails = data.data.errors.slice(0, 5).map(err => 
                    `행 ${err.row}: ${err.error}`
                ).join('\n');
                alert(`${message}\n\n오류 내역 (최대 5개):\n${errorDetails}`);
            } else {
                alert(message);
            }
        } else {
            alert(data.message || 'CSV 업로드에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 학생 수정 모달 열기
async function openEditStudentModal(studentId) {
    try {
        const response = await fetch(`${USER_API}/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const student = data.data;
            
            // 폼에 학생 정보 채우기
            document.getElementById('edit-student-id').value = student._id;
            document.getElementById('edit-student-name').value = student.name;
            document.getElementById('edit-student-email').value = student.email;
            document.getElementById('edit-student-number').value = student.studentNumber || '';
            
            // 학년, 반, 번호 채우기
            document.getElementById('edit-student-grade').value = student.grade || '';
            document.getElementById('edit-student-class-num').value = student.classNum || '';
            document.getElementById('edit-student-number-input').value = student.number || '';
            
            // 클래스 목록 로드
            const select = document.getElementById('edit-student-class');
            select.innerHTML = '<option value="">클래스를 선택하세요</option>' + 
                classes.map(cls => `<option value="${cls._id}" ${cls._id === student.classId ? 'selected' : ''}>${cls.name}</option>`).join('');
            
            document.getElementById('modal-overlay').classList.add('active');
            document.getElementById('edit-student-modal').classList.add('active');
        } else {
            alert(data.message || '학생 정보를 불러오는데 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    }
}

// 학생 수정 처리
async function handleEditStudent(e) {
    e.preventDefault();
    showLoading(true);
    
    const studentId = document.getElementById('edit-student-id').value;
    const name = document.getElementById('edit-student-name').value;
    const email = document.getElementById('edit-student-email').value;
    const studentNumber = document.getElementById('edit-student-number').value;
    const classId = document.getElementById('edit-student-class').value;
    const grade = document.getElementById('edit-student-grade').value;
    const classNum = document.getElementById('edit-student-class-num').value;
    const number = document.getElementById('edit-student-number-input').value;
    
    try {
        const response = await fetch(`${USER_API}/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                name, 
                email, 
                studentNumber, 
                classId,
                grade: parseInt(grade),
                classNum: parseInt(classNum),
                number: parseInt(number)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadStudents();
            showMessage('학생 정보가 수정되었습니다', 'success');
        } else {
            alert(data.message || '학생 수정에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 학생 삭제
async function deleteStudent(studentId) {
    if (!confirm('정말 이 학생을 삭제하시겠습니까?')) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadStudents();
            showMessage('학생이 삭제되었습니다', 'success');
        } else {
            alert(data.message || '학생 삭제에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== 교사 관리 ====================

// 교사 목록 로드
async function loadTeachers() {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/teachers`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            teachers = data.data;
            renderTeachers();
        } else {
            alert(data.message || '교사 목록을 불러오는데 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 교사 렌더링
function renderTeachers() {
    const container = document.getElementById('teachers-list');
    const searchQuery = document.getElementById('teacher-search')?.value?.toLowerCase() || '';
    
    // 검색 필터링
    let filteredTeachers = teachers.filter(teacher => {
        return !searchQuery || 
            teacher.name.toLowerCase().includes(searchQuery) ||
            teacher.email.toLowerCase().includes(searchQuery);
    });
    
    // 정렬
    if (teacherSortColumn) {
        filteredTeachers.sort((a, b) => {
            let aVal = a[teacherSortColumn] || '';
            let bVal = b[teacherSortColumn] || '';
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return teacherSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return teacherSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // 페이지네이션
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const startIdx = (currentTeacherPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedTeachers = filteredTeachers.slice(startIdx, endIdx);
    
    if (filteredTeachers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">검색 결과가 없습니다.</p>';
        document.getElementById('teacher-pagination').innerHTML = '';
        return;
    }
    
    const getSortIcon = (column) => {
        if (teacherSortColumn !== column) return ' ↕';
        return teacherSortOrder === 'asc' ? ' ↑' : ' ↓';
    };
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="select-all-teachers" onchange="toggleSelectAllTeachers(this.checked)">
                    </th>
                    <th style="cursor: pointer;" onclick="sortTeachers('name')">이름${getSortIcon('name')}</th>
                    <th style="cursor: pointer;" onclick="sortTeachers('email')">이메일${getSortIcon('email')}</th>
                    <th style="cursor: pointer;" onclick="sortTeachers('createdAt')">등록일${getSortIcon('createdAt')}</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedTeachers.map(teacher => `
                    <tr>
                        <td>
                            <input type="checkbox" class="teacher-checkbox" value="${teacher._id}">
                        </td>
                        <td><a href="#" onclick="showTeacherDetail('${teacher._id}'); return false;" style="color: #667eea; text-decoration: none; font-weight: 500;">${teacher.name}</a></td>
                        <td>${teacher.email}</td>
                        <td>${new Date(teacher.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // 페이지네이션 렌더링
    renderPagination('teacher-pagination', currentTeacherPage, totalPages, (page) => {
        currentTeacherPage = page;
        renderTeachers();
    });
}

// 교사 추가 모달 열기
function openAddTeacherModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('add-teacher-modal').classList.add('active');
}

// 교사 추가
async function handleAddTeacher(e) {
    e.preventDefault();
    showLoading(true);
    
    const name = document.getElementById('teacher-name').value;
    const email = document.getElementById('teacher-email').value;
    const password = document.getElementById('teacher-password').value;
    
    try {
        const response = await fetch(`${USER_API}/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadTeachers();
            e.target.reset();
            showMessage('교사가 등록되었습니다', 'success');
        } else {
            alert(data.message || '교사 등록에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 교사 수정 모달 열기
async function openEditTeacherModal(teacherId) {
    try {
        const response = await fetch(`${USER_API}/teachers/${teacherId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const teacher = data.data;
            document.getElementById('edit-teacher-id').value = teacher._id;
            document.getElementById('edit-teacher-name').value = teacher.name;
            document.getElementById('edit-teacher-email').value = teacher.email;
            
            document.getElementById('modal-overlay').classList.add('active');
            document.getElementById('edit-teacher-modal').classList.add('active');
        } else {
            alert(data.message || '교사 정보를 불러오는데 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    }
}

// 교사 수정
async function handleEditTeacher(e) {
    e.preventDefault();
    showLoading(true);
    
    const teacherId = document.getElementById('edit-teacher-id').value;
    const name = document.getElementById('edit-teacher-name').value;
    const email = document.getElementById('edit-teacher-email').value;
    
    try {
        const response = await fetch(`${USER_API}/teachers/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadTeachers();
            showMessage('교사 정보가 수정되었습니다', 'success');
        } else {
            alert(data.message || '교사 수정에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 교사 삭제
async function deleteTeacher(teacherId) {
    if (!confirm('정말 이 교사를 삭제하시겠습니까?')) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadTeachers();
            showMessage('교사가 삭제되었습니다', 'success');
        } else {
            alert(data.message || '교사 삭제에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// CSV 업로드 모달 열기 (교사)
function openUploadTeacherCSVModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('upload-teacher-csv-modal').classList.add('active');
}

// CSV 업로드 처리 (교사)
async function handleUploadTeacherCSV(e) {
    e.preventDefault();
    showLoading(true);
    
    const fileInput = document.getElementById('teacher-csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요');
        showLoading(false);
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${USER_API}/teachers/upload-csv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadTeachers();
            e.target.reset();
            
            const results = data.data;
            const message = `CSV 업로드 완료\n성공: ${results.success.length}명\n실패: ${results.failed.length}명`;
            
            if (results.failed.length > 0) {
                const errorDetails = results.failed.slice(0, 5).map(err => 
                    `행 ${err.row} (${err.email}): ${err.reason}`
                ).join('\n');
                alert(`${message}\n\n오류 내역 (최대 5개):\n${errorDetails}`);
            } else {
                alert(message);
            }
        } else {
            alert(data.message || 'CSV 업로드에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// CSV 다운로드 (교사)
async function downloadTeacherCSV() {
    try {
        const response = await fetch(`${USER_API}/teachers/download-csv`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teachers_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('CSV 다운로드에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    }
}

// 클래스 상세 보기
async function viewClass(classId) {
    currentClassroom = classes.find(c => c._id === classId);
    if (!currentClassroom) {
        alert('클래스를 찾을 수 없습니다');
        return;
    }

    // 대시보드 숨기고 클래스룸 표시
    document.getElementById('dashboard-page').classList.remove('active');
    document.getElementById('classroom-page').classList.add('active');

    // 헤더 정보 업데이트
    document.getElementById('classroom-name').textContent = currentClassroom.name;
    document.getElementById('classroom-desc').textContent = 
        `학년: ${currentClassroom.grade}학년 | 반: ${currentClassroom.section}반`;
    document.getElementById('classroom-code-display').textContent = 
        `클래스 코드: ${currentClassroom.classCode}`;

    // 데이터 로드
    await loadClassroomData();
}

// 클래스룸 데이터 로드
async function loadClassroomData() {
    showLoading(true);
    
    try {
        // 클래스 상세 정보 가져오기
        const response = await fetch(`${USER_API}/classes/${currentClassroom._id}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentClassroom = data.data;
            
            // 각 탭 렌더링
            renderStream();
            renderClassworkAssignments();
            renderClassroomStudents();
        }
    } catch (error) {
        console.error('클래스룸 데이터 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 스트림 (공지사항) 렌더링
function renderStream() {
    const container = document.getElementById('stream-list');
    
    // 샘플 공지사항 (추후 API 연동)
    const sampleAnnouncements = [
        {
            author: currentUser.name,
            date: new Date().toLocaleDateString(),
            content: `${currentClassroom.name}에 오신 것을 환영합니다! 📚`
        }
    ];
    
    const allAnnouncements = [...announcements, ...sampleAnnouncements];
    
    if (allAnnouncements.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 공지사항이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = allAnnouncements.map(announcement => `
        <div class="stream-item">
            <div class="stream-item-header">
                <div class="stream-avatar">
                    ${announcement.author.charAt(0).toUpperCase()}
                </div>
                <div class="stream-info">
                    <h4>${announcement.author}</h4>
                    <p>${announcement.date}</p>
                </div>
            </div>
            <div class="stream-content">
                ${announcement.content}
            </div>
        </div>
    `).join('');
}

// 클래스룸 과제 렌더링
function renderClassworkAssignments() {
    const container = document.getElementById('classroom-assignments-list');
    
    // 이 클래스의 과제만 필터링
    const classAssignments = assignments.filter(a => a.classId === currentClassroom._id);
    
    if (classAssignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 과제가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = classAssignments.map(assignment => `
        <div class="assignment-card" onclick="viewAssignment('${assignment._id}')">
            <div class="assignment-icon">📝</div>
            <div class="assignment-info">
                <h4>${assignment.title}</h4>
                <p>마감일: ${new Date(assignment.dueDate).toLocaleDateString()}</p>
            </div>
            <div class="assignment-status">
                ${assignment.status || '게시됨'}
            </div>
        </div>
    `).join('');
}

// 클래스룸 학생 목록 렌더링
function renderClassroomStudents() {
    const container = document.getElementById('classroom-students-list');
    const countElement = document.getElementById('students-count');
    
    // 이 클래스의 학생들만 필터링
    const classStudents = students.filter(s => 
        currentClassroom.studentIds?.includes(s._id)
    );
    
    countElement.textContent = `학생 ${classStudents.length}명`;
    
    if (classStudents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 등록된 학생이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = classStudents.map(student => `
        <div class="student-item">
            <div class="student-avatar">
                ${student.name.charAt(0).toUpperCase()}
            </div>
            <div class="student-name">${student.name}</div>
            <div class="student-email">${student.email}</div>
        </div>
    `).join('');
}

// 클래스룸 탭 전환
function switchClassroomTab(tab) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 탭 콘텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// 대시보드로 돌아가기
function backToDashboard() {
    document.getElementById('classroom-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    currentClassroom = null;
}

// 공지사항 작성 모달 열기
function openAnnouncementModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('announcement-modal').classList.add('active');
}

// 공지사항 게시
async function handlePostAnnouncement(e) {
    e.preventDefault();
    
    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    
    // 로컬 공지사항 추가 (추후 API 연동)
    const newAnnouncement = {
        author: currentUser.name,
        date: new Date().toLocaleDateString(),
        content: `<strong>${title}</strong><br>${content}`
    };
    
    announcements.unshift(newAnnouncement);
    
    closeModal();
    renderStream();
    e.target.reset();
    
    showMessage('공지사항이 게시되었습니다', 'success');
}

// 과제 보기 (추후 구현)
function viewAssignment(assignmentId) {
    loadAssignmentDetail(assignmentId);
}

// 과제 상세 및 제출 목록 로드
async function loadAssignmentDetail(assignmentId) {
    showLoading(true);
    
    try {
        // 과제 정보 로드
        const assignmentResponse = await fetch(`${ASSIGNMENT_API}/assignments/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!assignmentResponse.ok) {
            alert('과제를 불러올 수 없습니다');
            showLoading(false);
            return;
        }
        
        const assignmentData = await assignmentResponse.json();
        const assignment = assignmentData.data;
        
        // 제출 목록 로드 (교사/관리자만)
        if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
            const submissionsResponse = await fetch(`${ASSIGNMENT_API}/assignments/${assignmentId}/submissions`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            if (submissionsResponse.ok) {
                const submissionsData = await submissionsResponse.json();
                showAssignmentDetailModal(assignment, submissionsData.data);
            } else {
                showAssignmentDetailModal(assignment, null);
            }
        } else {
            // 학생은 제출 정보만
            showAssignmentDetailModal(assignment, null);
        }
    } catch (error) {
        alert('과제 로드 실패: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 과제 상세 모달 표시
function showAssignmentDetailModal(assignment, submissionData) {
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = dueDate < new Date();
    
    let modalContent = `
        <div class="modal" id="assignment-detail-modal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${assignment.title}</h3>
                    <button class="close-btn" onclick="closeAssignmentDetail()">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px; padding: 15px; background: ${isOverdue ? '#ffe6e6' : '#f0f4ff'}; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>마감일:</strong> ${dueDate.toLocaleString('ko-KR')}
                                ${isOverdue ? '<span style="color: #e74c3c; margin-left: 10px;">📌 마감</span>' : ''}
                            </div>
                            ${submissionData ? `
                                <div style="font-size: 18px; font-weight: bold; color: ${submissionData.submittedCount === submissionData.totalStudents ? '#27ae60' : '#667eea'};">
                                    ${submissionData.submittedCount} / ${submissionData.totalStudents} 제출
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${assignment.description ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin-bottom: 10px;">설명</h4>
                            <p style="color: #666; white-space: pre-wrap;">${assignment.description}</p>
                        </div>
                    ` : ''}
                    
                    ${submissionData && submissionData.students ? `
                        <div>
                            <h4 style="margin-bottom: 15px;">학생 제출 현황</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 12px; text-align: left;">이름</th>
                                        <th style="padding: 12px; text-align: left;">학번</th>
                                        <th style="padding: 12px; text-align: center;">제출 상태</th>
                                        <th style="padding: 12px; text-align: center;">제출 시간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${submissionData.students.map(student => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 12px;">${student.name}</td>
                                            <td style="padding: 12px;">${student.studentNumber || '-'}</td>
                                            <td style="padding: 12px; text-align: center;">
                                                ${student.submitted 
                                                    ? '<span style="color: #27ae60; font-weight: bold;">✓ 제출</span>' 
                                                    : '<span style="color: #e74c3c;">✗ 미제출</span>'}
                                            </td>
                                            <td style="padding: 12px; text-align: center; color: #666;">
                                                ${student.submittedAt ? new Date(student.submittedAt).toLocaleString('ko-KR') : '-'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="closeAssignmentDetail()" class="btn btn-secondary">닫기</button>
                </div>
            </div>
        </div>
        <div class="modal-overlay" id="assignment-modal-overlay" style="display: block;" onclick="closeAssignmentDetail()"></div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('assignment-detail-modal');
    if (existingModal) existingModal.remove();
    const existingOverlay = document.getElementById('assignment-modal-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

// 과제 상세 모달 닫기
function closeAssignmentDetail() {
    const modal = document.getElementById('assignment-detail-modal');
    const overlay = document.getElementById('assignment-modal-overlay');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

// 과제 생성 모달 열기
function openCreateAssignmentModal() {
    // 클래스 목록 로드
    const selectEl = document.getElementById('assignment-class');
    selectEl.innerHTML = '<option value="">클래스를 선택하세요</option>' + 
        classes.map(cls => `<option value="${cls._id}">${cls.name}</option>`).join('');
    
    // 기본 마감일 설정 (내일)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59);
    const dateString = tomorrow.toISOString().slice(0, 16);
    document.getElementById('assignment-due-date').value = dateString;
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('create-assignment-modal').classList.add('active');
}

// 과제 생성 처리
async function handleCreateAssignment(e) {
    e.preventDefault();
    showLoading(true);
    
    const title = document.getElementById('assignment-title').value;
    const description = document.getElementById('assignment-description').value;
    const classId = document.getElementById('assignment-class').value;
    const dueDate = document.getElementById('assignment-due-date').value;
    
    try {
        const response = await fetch(`${ASSIGNMENT_API}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                title, 
                description,
                classId,
                dueDate: new Date(dueDate).toISOString()
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadAssignments();
            e.target.reset();
            alert('과제가 생성되었습니다!');
        } else {
            alert(data.message || '과제 생성에 실패했습니다');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 과제 제출 모달 열기
function openSubmitAssignmentModal(assignment) {
    document.getElementById('submit-assignment-id').value = assignment._id;
    document.getElementById('submit-class-id').value = assignment.classId;
    document.getElementById('submit-assignment-title').value = assignment.title;
    document.getElementById('submit-content').value = '';
    document.getElementById('submit-files').value = '';
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('submit-assignment-modal').classList.add('active');
}

// 과제 제출 처리
async function handleSubmitAssignment(e) {
    e.preventDefault();
    showLoading(true);
    
    const assignmentId = document.getElementById('submit-assignment-id').value;
    const classId = document.getElementById('submit-class-id').value;
    const content = document.getElementById('submit-content').value;
    const filesInput = document.getElementById('submit-files');
    
    try {
        let fileIds = [];
        
        // 파일이 있으면 먼저 파일 업로드
        if (filesInput.files.length > 0) {
            const formData = new FormData();
            formData.append('classId', classId);
            formData.append('assignmentId', assignmentId);
            
            for (let i = 0; i < filesInput.files.length; i++) {
                formData.append('files', filesInput.files[i]);
            }
            
            const fileResponse = await fetch(`${FILE_API}/upload/assignment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                body: formData
            });
            
            const fileData = await fileResponse.json();
            
            if (fileResponse.ok) {
                fileIds = fileData.data.map(f => f.fileId);
            } else {
                throw new Error(fileData.message || '파일 업로드 실패');
            }
        }
        
        // 제출물 생성
        const response = await fetch(`${ASSIGNMENT_API}/submissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                assignmentId,
                content,
                fileIds
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            loadAssignments(); // 과제 목록 새로고침
            alert('과제가 제출되었습니다!');
        } else {
            alert(data.message || '과제 제출에 실패했습니다');
        }
    } catch (error) {
        alert('오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 학생용 - 내가 가입한 클래스 로드
async function loadMyClasses() {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/classes`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            // 학생이 속한 클래스만 필터링
            classes = data.data.filter(cls => 
                cls.studentIds?.includes(currentUser.userId || currentUser._id)
            );
            renderStudentClasses();
        }
    } catch (error) {
        console.error('내 클래스 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 학생용 클래스 렌더링
function renderStudentClasses() {
    const container = document.getElementById('classes-list');
    const headerEl = document.querySelector('#classes-section .section-header h2');
    const buttonContainer = document.querySelector('#classes-section .section-header');
    
    // 헤더 변경
    if (headerEl) headerEl.textContent = '내 클래스';
    
    // 클래스 생성 버튼 숨기고 클래스 코드 입력 버튼 추가
    if (buttonContainer) {
        const existingButton = buttonContainer.querySelector('button');
        if (existingButton) existingButton.remove();
        
        const joinButton = document.createElement('button');
        joinButton.className = 'btn btn-primary';
        joinButton.textContent = '+ 클래스 코드로 가입';
        joinButton.onclick = openJoinClassModal;
        buttonContainer.appendChild(joinButton);
    }
    
    if (classes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <p style="font-size: 48px; margin-bottom: 20px;">📚</p>
                <h3 style="color: #666; margin-bottom: 10px;">아직 가입한 클래스가 없습니다</h3>
                <p style="color: #999;">교사가 알려준 클래스 코드로 가입하세요!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = classes.map(cls => `
        <div class="class-card" onclick="viewClass('${cls._id}')">
            <h3>${cls.name}</h3>
            <p>학년: ${cls.grade}학년 ${cls.section}반</p>
            <div class="stats">
                <div class="stat">
                    <span>👥</span>
                    <span>${cls.studentIds?.length || 0}명</span>
                </div>
                <div class="stat">
                    <span>📝</span>
                    <span>${cls.assignmentCount || 0}개 과제</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 학생용 - 내 과제 로드
async function loadMyAssignments() {
    showLoading(true);
    
    try {
        const response = await fetch(`${ASSIGNMENT_API}/assignments`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.data) {
            assignments = data.data;
            renderStudentAssignments();
        }
    } catch (error) {
        console.error('내 과제 로드 실패:', error);
    } finally {
        showLoading(false);
    }
}

// 학생용 과제 렌더링
function renderStudentAssignments() {
    const container = document.getElementById('assignments-list');
    const headerEl = document.querySelector('#assignments-section .section-header h2');
    const buttonContainer = document.querySelector('#assignments-section .section-header button');
    
    // 헤더 변경 및 과제 생성 버튼 숨기기
    if (headerEl) headerEl.textContent = '내 과제';
    if (buttonContainer) buttonContainer.style.display = 'none';
    
    if (assignments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <p style="font-size: 48px; margin-bottom: 20px;">📝</p>
                <h3 style="color: #666; margin-bottom: 10px;">아직 과제가 없습니다</h3>
                <p style="color: #999;">교사가 과제를 올리면 여기에 표시됩니다</p>
            </div>
        `;
        return;
    }
    
    // 과제를 상태별로 그룹화
    const pending = assignments.filter(a => !a.submitted);
    const completed = assignments.filter(a => a.submitted);
    
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #e74c3c; margin-bottom: 15px;">📌 제출 대기 중 (${pending.length})</h3>
            ${pending.length === 0 ? '<p style="color: #999;">모든 과제를 제출했습니다! 🎉</p>' : 
                pending.map(assignment => `
                    <div class="assignment-card" onclick="viewAssignment('${assignment._id}')" style="border-left: 4px solid #e74c3c;">
                        <div class="assignment-info">
                            <h4>${assignment.title}</h4>
                            <p>마감일: ${new Date(assignment.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div class="assignment-status" style="color: #e74c3c;">미제출</div>
                    </div>
                `).join('')
            }
        </div>
        
        <div>
            <h3 style="color: #27ae60; margin-bottom: 15px;">✅ 제출 완료 (${completed.length})</h3>
            ${completed.length === 0 ? '<p style="color: #999;">제출한 과제가 없습니다</p>' : 
                completed.map(assignment => `
                    <div class="assignment-card" onclick="viewAssignment('${assignment._id}')" style="border-left: 4px solid #27ae60;">
                        <div class="assignment-info">
                            <h4>${assignment.title}</h4>
                            <p>제출일: ${new Date(assignment.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <div class="assignment-status" style="color: #27ae60;">제출 완료</div>
                    </div>
                `).join('')
            }
        </div>
    `;
}

// 클래스 코드로 가입 모달
function openJoinClassModal() {
    const code = prompt('클래스 코드를 입력하세요:');
    if (!code) return;
    
    joinClassByCode(code);
}

// 클래스 코드로 가입
async function joinClassByCode(classCode) {
    showLoading(true);
    
    try {
        const response = await fetch(`${USER_API}/classes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ classCode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`${data.data.className} 클래스에 가입되었습니다!`);
            loadMyClasses();
        } else {
            alert(data.message || '클래스 가입 실패');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== 이전 버전 교사 관리 함수 (제거됨) ====================
// 중복 제거: loadTeachers는 위에 이미 구현되어 있음

// 비밀번호 변경 모달 표시
function showPasswordChangeModal() {
    const modalHTML = `
        <div id="password-change-modal" class="modal active" style="z-index: 10000;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>비밀번호 변경</h3>
                </div>
                <form id="password-change-form">
                    <div class="form-group">
                        <label>현재 비밀번호</label>
                        <input type="password" id="current-password" required>
                    </div>
                    <div class="form-group">
                        <label>새 비밀번호</label>
                        <input type="password" id="new-password" minlength="6" required>
                    </div>
                    <div class="form-group">
                        <label>새 비밀번호 확인</label>
                        <input type="password" id="confirm-password" minlength="6" required>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">변경</button>
                    </div>
                </form>
            </div>
        </div>
        <div id="password-modal-overlay" class="modal-overlay active" style="z-index: 9999;"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('password-change-form').addEventListener('submit', handlePasswordChange);
}

// 비밀번호 변경 처리
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('새 비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('비밀번호가 성공적으로 변경되었습니다!');
            const modal = document.getElementById('password-change-modal');
            const overlay = document.getElementById('password-modal-overlay');
            if (modal) modal.remove();
            if (overlay) overlay.remove();
        } else {
            alert(data.error || '비밀번호 변경 실패');
        }
    } catch (error) {
        alert('서버 연결 오류: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 로딩 표시
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

// 메시지 표시
function showMessage(message, type) {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.innerHTML = message;  // HTML 지원
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}

// ========== 검색 기능 ==========

// 학생 검색
function searchStudents() {
    currentStudentPage = 1; // 검색 시 첫 페이지로
    renderStudents();
}

// 학생 필터링
function filterStudents() {
    currentStudentPage = 1; // 필터 변경 시 첫 페이지로
    renderStudents();
}

// 학생 정렬
function sortStudents(column) {
    if (studentSortColumn === column) {
        studentSortOrder = studentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        studentSortColumn = column;
        studentSortOrder = 'asc';
    }
    renderStudents();
}

// 교사 검색
function searchTeachers() {
    currentTeacherPage = 1; // 검색 시 첫 페이지로
    renderTeachers();
}

// 교사 정렬
function sortTeachers(column) {
    if (teacherSortColumn === column) {
        teacherSortOrder = teacherSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        teacherSortColumn = column;
        teacherSortOrder = 'asc';
    }
    renderTeachers();
}

// ========== 페이지네이션 ==========

function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // 이전 버튼
    if (currentPage > 1) {
        paginationHTML += `<button onclick="changePage(${currentPage - 1}, '${containerId}')" class="page-btn">이전</button>`;
    }
    
    // 페이지 번호
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1, '${containerId}')" class="page-btn">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span class="page-dots">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `<button onclick="changePage(${i}, '${containerId}')" class="page-btn ${activeClass}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="page-dots">...</span>';
        }
        paginationHTML += `<button onclick="changePage(${totalPages}, '${containerId}')" class="page-btn">${totalPages}</button>`;
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${currentPage + 1}, '${containerId}')" class="page-btn">다음</button>`;
    }
    
    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
}

function changePage(page, containerId) {
    if (containerId === 'student-pagination') {
        currentStudentPage = page;
        renderStudents();
    } else if (containerId === 'teacher-pagination') {
        currentTeacherPage = page;
        renderTeachers();
    }
}

// ========== 체크박스 선택 ==========

function toggleSelectAllStudents(checked) {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

function toggleSelectAllTeachers(checked) {
    const checkboxes = document.querySelectorAll('.teacher-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

// ========== 다중 삭제 ==========

async function deleteSelectedStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        alert('삭제할 학생을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${selectedIds.length}명의 학생을 삭제하시겠습니까?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const id of selectedIds) {
            try {
                const response = await fetch(`${USER_API}/students/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }
        
        alert(`삭제 완료: 성공 ${successCount}명, 실패 ${failCount}명`);
        await loadStudents();
    } catch (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function deleteSelectedTeachers() {
    const checkboxes = document.querySelectorAll('.teacher-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        alert('삭제할 교사를 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${selectedIds.length}명의 교사를 삭제하시겠습니까?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const id of selectedIds) {
            try {
                const response = await fetch(`${USER_API}/teachers/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }
        
        alert(`삭제 완료: 성공 ${successCount}명, 실패 ${failCount}명`);
        await loadTeachers();
    } catch (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ========== 상세 정보 모달 ==========

function showStudentDetail(studentId) {
    const student = students.find(s => s._id === studentId);
    if (!student) return;
    
    selectedStudentId = studentId;
    
    document.getElementById('detail-student-name').textContent = student.name;
    document.getElementById('detail-student-number').textContent = student.studentNumber || '-';
    document.getElementById('detail-student-email').textContent = student.email;
    document.getElementById('detail-student-admission').textContent = student.admissionYear || '-';
    document.getElementById('detail-student-grade').textContent = student.grade ? `${student.grade}학년` : '-';
    document.getElementById('detail-student-class').textContent = student.classNum ? `${student.classNum}반` : '-';
    document.getElementById('detail-student-num').textContent = student.number ? `${student.number}번` : '-';
    document.getElementById('detail-student-class-name').textContent = student.className || '-';
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('student-detail-modal').classList.add('active');
}

function showTeacherDetail(teacherId) {
    const teacher = teachers.find(t => t._id === teacherId);
    if (!teacher) return;
    
    selectedTeacherId = teacherId;
    
    document.getElementById('detail-teacher-name').textContent = teacher.name;
    document.getElementById('detail-teacher-email').textContent = teacher.email;
    document.getElementById('detail-teacher-subject').textContent = teacher.subject || '-';
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('teacher-detail-modal').classList.add('active');
}

function openEditStudentFromDetail() {
    closeModal();
    openEditStudentModal(selectedStudentId);
}

function openEditTeacherFromDetail() {
    closeModal();
    openEditTeacherModal(selectedTeacherId);
}

async function deleteStudentFromDetail() {
    if (!confirm('이 학생을 삭제하시겠습니까?')) {
        return;
    }
    
    closeModal();
    await deleteStudent(selectedStudentId);
}

async function deleteTeacherFromDetail() {
    if (!confirm('이 교사를 삭제하시겠습니까?')) {
        return;
    }
    
    closeModal();
    await deleteTeacher(selectedTeacherId);
}

// ========== 학번 자동 생성 (수정 모달용) ==========

function generateEditStudentNumber() {
    const grade = document.getElementById('edit-student-grade').value;
    const classNum = document.getElementById('edit-student-class-num').value;
    const number = document.getElementById('edit-student-number-input').value;
    
    if (grade && classNum && number) {
        const studentNumber = `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;
        document.getElementById('edit-student-number').value = studentNumber;
    }
}

