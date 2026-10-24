# Global UI Design System — Editorial Tech

## 1. Mục tiêu

Phong cách trong `DESIGN (1).md` được chọn làm **phong cách giao diện chính thức cho toàn bộ dự án Hệ thống hỗ trợ tự học ứng dụng AI**.

Không giới hạn ở Dashboard.

Phong cách này phải được áp dụng nhất quán cho:

- Login;
- Profile;
- Dashboard;
- Student learning screens;
- Teacher screens;
- Administrator screens;
- Forms;
- Tables;
- Lists;
- Detail pages;
- AI analysis;
- AI preview;
- History;
- Filter;
- Modal;
- Confirmation dialog;
- Toast;
- Loading;
- Empty state;
- Error state;
- Navigation;
- Responsive UI;
- các màn hình mới được bổ sung sau này.

Mọi màn hình tương lai phải phát triển dựa trên Design System này thay vì tự chọn phong cách riêng.

---

# 2. Visual Identity

Phong cách tổng thể:

**Editorial Tech**

Đặc trưng:

```text
Warm cream canvas
+ Deep violet ink
+ Butter yellow accent
+ Deep teal contrast
+ Sharp geometry
+ Thin borders
+ Large confident typography
+ Flat illustrations
+ Spacious composition
```

Phong cách tham chiếu mô tả chính xác hướng này là một môi trường “editorial-tech” với nền giấy kem, chữ violet rất đậm, vàng làm accent và teal làm vùng tương phản.

---

# 3. Design Tokens

## 3.1. Color

### Primary canvas

```css
--color-background: #fffcf7;
```

Dùng cho:

- body;
- app background;
- login background;
- sidebar;
- page background.

Không dùng trắng tinh làm background toàn trang.

---

### Primary ink

```css
--color-ink: #0d0129;
```

Dùng cho:

- heading;
- body text;
- border;
- icon;
- navigation;
- table structure.

---

### Accent Yellow

```css
--color-accent: #fae59b;
```

Dùng cho:

- CTA;
- AI action;
- selected navigation;
- emphasis;
- highlight;
- một số trạng thái warning.

---

### Deep Teal

```css
--color-teal: #19615c;
```

Dùng cho:

- AI insight;
- feature area;
- strong informational section;
- selected/high-value state;
- section cần tạo tương phản.

---

### Elevated white

```css
--color-surface: #ffffff;
```

Dùng cho:

- form;
- table;
- card cần nổi khỏi background;
- modal.

Palette này xuất phát trực tiếp từ style reference.

---

# 4. Typography

Font triển khai mặc định:

```text
Inter
```

Roobert là font gốc của phong cách tham chiếu; Inter là một trong các font substitute được chính tài liệu đề xuất.

## Hierarchy

### Display

Dùng hạn chế cho:

- Login;
- empty state lớn;
- onboarding;
- hero-like screen.

```text
48–64px
700
```

### Page title

```text
32–40px
700
```

### Section title

```text
24px
700
```

### Component heading

```text
18–20px
700
```

### Body

```text
16px
400
```

### Supporting text

```text
14px
400
```

Không phải màn hình nào cũng cần heading rất lớn.

Phong cách editorial được giữ thông qua **hierarchy và khoảng trắng**, không phải bằng cách ép mọi trang dùng headline 64px.

---

# 5. Geometry

Đây là nguyên tắc global.

```css
border-radius: 0;
```

Áp dụng cho:

- button;
- input;
- select;
- textarea;
- card;
- table;
- modal;
- badge;
- toast;
- dropdown;
- panel;
- navigation item.

Style reference xác định card, input và button đều dùng góc vuông.

---

# 6. Borders

Border là yếu tố cấu trúc chính:

```css
border: 1px solid #0d0129;
```

Thay vì sử dụng:

- shadow lớn;
- background xám;
- rounded container.

Các khu vực giao diện được phân chia giống các khung trong một trang tạp chí.

---

# 7. Shadow

Không sử dụng soft shadow cho card.

CTA quan trọng có thể dùng:

```css
box-shadow: 2px 2px 0 #000000;
```

Tạo cảm giác giống nút/sticker vật lý.

Tinh thần này bắt nguồn từ CTA của style tham chiếu.

---

# 8. Navigation

Design System phải hỗ trợ nhiều loại navigation.

## Protected application

```text
Sidebar
+
Top bar
+
Main content
```

Đây vẫn là layout chính của các màn hình nghiệp vụ.

Nhưng layout này **không định nghĩa phong cách**.

Phong cách Editorial Tech vẫn được dùng trên:

- sidebar;
- nav item;
- breadcrumb;
- account menu;
- role navigation.

---

# 9. Login

Login không cần sidebar.

Có thể sử dụng bố cục editorial:

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│ AI STUDY                                         │
│                                                  │
│ Học tập thông minh,                              │
│ tiến bộ có định hướng.       ┌────────────────┐ │
│                              │ ĐĂNG NHẬP      │ │
│                              │                │ │
│                              │ Email          │ │
│                              │ [............] │ │
│                              │                │ │
│                              │ Mật khẩu       │ │
│                              │ [............] │ │
│                              │                │ │
│                              │ [ ĐĂNG NHẬP →] │ │
│                              └────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

Không cần biến Login thành dashboard.

Nó vẫn giữ:

- cream background;
- strong typography;
- square form;
- violet border;
- yellow CTA.

---

# 10. Dashboard

Dashboard là **một pattern**, không phải toàn bộ Design System.

Sử dụng:

- metric cards;
- status panels;
- tables;
- quick actions;
- warnings;
- AI CTA.

Ví dụ:

```text
Metric
Metric
Metric

Current status

Recent information

Upcoming actions
```

Vẫn dùng toàn bộ token chung.

---

# 11. List Screens

Ví dụ:

- danh sách Student;
- danh sách Class;
- feedback;
- users;
- AI history.

Pattern:

```text
Page title
Description

Filter / search                Action

┌─────────────────────────────────────────────┐
│ TABLE HEADER                                │
├─────────────────────────────────────────────┤
│ row                                         │
├─────────────────────────────────────────────┤
│ row                                         │
└─────────────────────────────────────────────┘

Pagination
```

Không biến list thành một collection các card bo góc.

---

# 12. Detail Screens

Ví dụ:

```text
Student Detail
Class Detail
Profile
AI History Detail
```

Pattern:

```text
Page header

Primary information

┌───────────────┬────────────────────────────┐
│ Metadata      │ Main information           │
│               │                            │
│               │                            │
└───────────────┴────────────────────────────┘
```

Nếu có nhiều dữ liệu có thể chia thành editorial sections.

---

# 13. Forms

Toàn hệ thống dùng cùng form language.

Input:

```text
LABEL

┌────────────────────────────────┐
│ value                          │
└────────────────────────────────┘
support text
```

Không:

- rounded field;
- floating label;
- gradient focus.

Focus:

```css
outline: 2px solid #19615c;
```

Validation error hiển thị sát field.

---

# 14. Buttons

## Primary AI Action

```text
[ PHÂN TÍCH BẰNG AI → ]
```

```css
background: #fae59b;
border: 1px solid #0d0129;
box-shadow: 2px 2px 0 #000;
```

---

## Primary non-AI Action

Có thể sử dụng:

```text
[ LƯU ]
```

Ink Violet / cream hoặc outlined depending context.

---

## Secondary

```text
[ Hủy ]
```

Transparent background + border.

---

## Destructive

Sử dụng semantic red riêng.

Không dùng yellow cho destructive action.

---

# 15. AI Visual Language

AI là chức năng nổi bật của đề tài nên cần visual language riêng.

## AI Trigger

Yellow.

```text
[ PHÂN TÍCH BẰNG AI → ]
```

## AI Processing

Giữ cùng vùng UI nhưng chuyển sang:

```text
Đang phân tích dữ liệu...
```

có loading indicator đơn giản.

Không tạo một phong cách hoàn toàn khác.

---

## AI Result

Teal hoặc cream + teal accent.

Ví dụ:

```text
┌───────────────────────────────────────┐
│ PHÂN TÍCH TỪ AI                      │
│                                       │
│ Lớp đang gặp khó khăn ở...           │
│                                       │
│ ĐỀ XUẤT                               │
│ → Ôn kiến thức nền                    │
│ → Bài thực hành ngắn                  │
└───────────────────────────────────────┘
```

---

# 16. System Data vs AI Data

Đây là quy tắc bắt buộc.

### System Data

```text
DỮ LIỆU HỆ THỐNG
```

Cream / white.

### AI Result

```text
PHÂN TÍCH TỪ AI
```

Yellow / teal visual language.

Điều này giữ đúng baseline UI hiện tại: dữ liệu hệ thống và nội dung do AI sinh phải được phân biệt rõ.

---

# 17. Preview Pattern

Dùng cho:

- StudyPlan preview;
- Adjustment preview.

Ví dụ:

```text
KẾ HOẠCH AI ĐỀ XUẤT

Plan title

Task 01
Task 02
Task 03

────────────────────────────

[ TỪ CHỐI ]      [ ÁP DỤNG KẾ HOẠCH → ]
```

Đây vẫn là cùng Design System.

Không tạo style riêng cho preview.

---

# 18. History

Dùng cho:

- Teacher AI history;
- Administrator feedback analysis history.

Pattern:

```text
Lịch sử phân tích

Filter

┌────────────────────────────────────────┐
│ Ngày       Phạm vi       Trạng thái    │
├────────────────────────────────────────┤
│ ...                                    │
└────────────────────────────────────────┘
```

Detail của history dùng các component read-only bình thường.

---

# 19. Modal / Dialog

Modal vẫn dùng:

```text
white
1px violet border
0 radius
```

Ví dụ:

```text
┌─────────────────────────────────────┐
│ XÁC NHẬN                            │
│                                     │
│ Áp dụng kế hoạch này?               │
│                                     │
│ [ HỦY ]                [ ÁP DỤNG ] │
└─────────────────────────────────────┘
```

Không dùng floating rounded dialog.

---

# 20. Loading

Không dùng animation phức tạp.

Có thể dùng:

- line loader;
- basic spinner;
- skeleton có border nhẹ.

AI processing có thể thêm một accent yellow nhỏ.

---

# 21. Empty State

Ví dụ:

```text
────────────────────────────────

Chưa có kế hoạch học tập.

Tạo kế hoạch cá nhân hóa dựa trên
mục tiêu và kết quả hiện tại.

[ TẠO KẾ HOẠCH BẰNG AI → ]

────────────────────────────────
```

Illustration nếu dùng phải là:

- flat;
- line-art;
- violet stroke;
- yellow / teal accent.

Điều này đúng với visual imagery của style tham chiếu.

---

# 22. Error State

Error vẫn giữ visual language chung.

Ví dụ:

```text
Không thể phân tích dữ liệu.

AI hiện không khả dụng.
Dữ liệu hiện tại của bạn không bị thay đổi.

[ THỬ LẠI ]
```

Semantic error red được phép bổ sung.

Không thay toàn màn hình thành thiết kế đỏ.

---

# 23. Tables

Tables sử dụng phong cách print/editorial.

```text
┌──────────────────────────────────────────┐
│ HỌ TÊN          ĐIỂM       TIẾN ĐỘ      │
├──────────────────────────────────────────┤
│ Nguyễn Văn A    72          60%          │
├──────────────────────────────────────────┤
│ Trần Văn B      58          42%          │
└──────────────────────────────────────────┘
```

Không:

- bo góc table;
- nhiều shadow;
- nhiều background alternating.

---

# 24. Status Badge

Badge vẫn vuông.

Ví dụ:

```text
[ ACTIVE ]
[ TODO ]
[ COMPLETED ]
[ HIGH ]
```

Sử dụng semantic colors vừa đủ.

Không biến mỗi badge thành một màu khác nhau quá mạnh.

---

# 25. Illustration

Nếu dự án cần:

- login illustration;
- empty state;
- AI state;
- onboarding.

Phong cách duy nhất được sử dụng:

```text
Flat line-art
Thin ink-violet stroke
Cream/white base
Yellow highlights
Teal secondary elements
No gradient
No 3D
No photography
```

Style reference cũng quy định hình ảnh theo hướng schematic line-art thay vì ảnh thật hoặc 3D.

---

# 26. Responsive

Phong cách vẫn giữ nguyên trên mobile.

Chỉ thay layout.

Desktop:

```text
Sidebar + content
```

Mobile:

```text
Top bar
Drawer navigation
Content
```

Không tạo mobile design language khác.

---

# 27. Role Identity

Không thiết kế ba theme riêng.

Student, Teacher và Administrator sử dụng **cùng Design System**.

Khác biệt nằm ở nội dung và information architecture.

### Student

```text
Learning
Progress
Tasks
AI Companion
```

### Teacher

```text
Class
Student Data
Teaching Insight
AI Recommendations
```

### Administrator

```text
System
Users
Feedback
AI System Intelligence
```

---

# 28. Global Component Library

Design System sẽ được hiện thực thành component dùng chung.

## Layout

```text
AppShell
AuthShell
Sidebar
TopBar
PageHeader
Section
ContentGrid
```

## Navigation

```text
NavItem
ClassContextNav
Breadcrumb
AccountMenu
```

## Input

```text
Input
Textarea
Select
Radio
Checkbox
DateInput
```

## Actions

```text
Button
AIActionButton
IconButton
```

## Data

```text
MetricCard
DataTable
FilterBar
Badge
Pagination
KeyValueList
```

## AI

```text
AIInsightPanel
AIProcessingState
AIErrorState
AIPreviewPanel
AIRecommendationList
```

## Feedback

```text
EmptyState
ErrorState
LoadingState
Toast
Alert
```

## Overlay

```text
Modal
ConfirmDialog
Dropdown
```

---

# 29. Design Rules

## Luôn làm

- nền cream;
- violet text/border;
- square geometry;
- clear hierarchy;
- generous whitespace;
- yellow accent có chủ đích;
- teal dùng cho contrast;
- AI và system data phân biệt rõ;
- component reuse.

---

# 30. Không làm

Không sử dụng:

- gradient;
- glassmorphism;
- neumorphism;
- soft large shadow;
- rounded cards;
- excessive pill UI;
- random colors;
- stock photography;
- realistic 3D renders;
- Bootstrap-like generic dashboard style.

Các giới hạn này bám sát phần Do/Don't trong style reference.

---

# 31. Quy tắc cho giao diện phát triển trong tương lai

Khi thêm một màn hình mới, không bắt đầu bằng câu hỏi:

> “Màn hình này nên có style gì?”

Thay vào đó:

```text
Global Design System
        ↓
Chọn layout pattern phù hợp
        ↓
Chọn component hiện có
        ↓
Chỉ bổ sung component nếu thật sự thiếu
```

Ví dụ:

```text
New screen
    ↓
List screen?
Detail screen?
Form?
Dashboard?
AI workflow?
History?
    ↓
Apply corresponding pattern
```

Nhờ đó tất cả giao diện hiện tại và tương lai vẫn thuộc cùng một sản phẩm.

---

# 32. Kết luận

`DESIGN (1).md` không chỉ là tham khảo cho dashboard.

Nó trở thành **visual foundation của toàn bộ dự án**.

Dashboard chỉ là một trong nhiều cách áp dụng Design System.

Các màn hình:

```text
Login
Dashboard
Form
List
Detail
AI Analysis
AI Preview
History
Modal
Error
Empty
Loading
```

đều phải mang cùng DNA:

```text
Cream
+
Violet
+
Yellow
+
Teal
+
Sharp corners
+
Thin borders
+
Editorial typography
+
Flat visual language
```

Đây là phong cách giao diện mặc định cho toàn bộ dự án từ thời điểm này trở đi.