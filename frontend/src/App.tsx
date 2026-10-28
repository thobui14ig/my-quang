import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined,
  Check, ChevronDown, CircleDollarSign, Coffee, LoaderCircle, LogOut, Plus, ReceiptText,
  Soup, Trash2, TrendingUp, Wallet, X, Users, UserRoundPlus, Pencil,
} from 'lucide-react';
import { api, Business, DashboardData, Employee, EmployeePayment, ReportRow, Sale, setToken, Transaction, User } from './api';

type Page = 'overview' | 'ledger' | 'employees' | 'reports';
type FormType = 'income' | 'expense';

const today = new Date().toLocaleDateString('sv-SE');
const money = (value: number | string) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value) || 0)} ₫`;
const displayDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Login({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ accessToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(result.user, result.accessToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="login-art-top"><span className="brand-mark"><Soup size={24} /></span><span>SỔ QUÁN</span></div>
        <div className="login-illustration"><Soup size={94} strokeWidth={1.2} /><span>QUÁN NHÀ MÌNH</span></div>
        <p>Gọn gàng sổ sách,<br />an tâm buôn bán mỗi ngày.</p>
        <span className="login-art-note">MỲ QUẢNG · SỔ THU CHI</span>
      </div>
      <form className="login-form" onSubmit={submit}>
        <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
        <h1>Đăng nhập</h1>
        <p className="muted">Đăng nhập để quản lý sổ thu chi của quán.</p>
        <label>Tên đăng nhập<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="button primary wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : null} Vào sổ quán <span>→</span></button>
        <p className="login-foot">Chỉ thành viên được cấp tài khoản mới có thể truy cập.</p>
      </form>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [date, setDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingEmployeePayment, setEditingEmployeePayment] = useState<EmployeePayment | null>(null);
  const [employeeMonth, setEmployeeMonth] = useState(today.slice(0, 7));
  const [report, setReport] = useState<ReportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [entryType, setEntryType] = useState<FormType>('income');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const loadOverview = useCallback(async () => {
    const [stats, shop] = await Promise.all([
      api<DashboardData>(`/dashboard?date=${date}&month=${selectedMonth}`),
      api<Business>('/business'),
    ]);
    setDashboard(stats);
    setBusiness(shop);
  }, [date, selectedMonth]);

  const loadLedger = useCallback(async () => {
    const monthEnd = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).toLocaleDateString('sv-SE');
    const query = `?from=${date.slice(0, 7)}-01&to=${monthEnd}`;
    const [items, dailySales] = await Promise.all([
      api<Transaction[]>(`/transactions${query}`),
      api<Sale[]>(`/sales${query}`),
    ]);
    setTransactions(items);
    setSales(dailySales);
  }, [date]);

  const loadReport = useCallback(async () => {
    setReport(await api<ReportRow[]>(`/reports?from=${from}&to=${to}`));
  }, [from, to]);

  const loadEmployees = useCallback(async () => {
    setEmployees(await api<Employee[]>('/employees'));
  }, []);

  const loadEmployeePayments = useCallback(async (employeeId: number) => {
    setEmployeePayments(await api<EmployeePayment[]>(`/employees/${employeeId}/payments`));
  }, []);

  const reload = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      if (page === 'overview') await loadOverview();
      if (page === 'ledger') await loadLedger();
      if (page === 'employees') await loadEmployees();
      if (page === 'reports') await loadReport();
    } catch (reason) {
      if (reason instanceof Error && /đăng nhập|phiên đăng nhập/i.test(reason.message)) logout();
      else setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.');
    } finally {
      setBusy(false);
    }
  }, [page, loadOverview, loadLedger, loadEmployees, loadReport]);

  useEffect(() => {
    const token = localStorage.getItem('my-quang-token');
    if (!token) { setReady(true); return; }
    api<User>('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  useEffect(() => {
    if (page === 'employees' && selectedEmployeeId === null && employees.length) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [page, selectedEmployeeId, employees]);

  useEffect(() => {
    if (page === 'employees' && selectedEmployeeId !== null) {
      void loadEmployeePayments(selectedEmployeeId).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử lương.');
      });
    } else {
      setEmployeePayments([]);
    }
  }, [page, selectedEmployeeId, loadEmployeePayments]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function onLogin(signedInUser: User, token: string) {
    setToken(token);
    setUser(signedInUser);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setDashboard(null);
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      type: entryType,
      amount: Number(form.get('amount')),
      description: String(form.get('description')).trim(),
      date: String(form.get('date')),
      note: String(form.get('note') ?? '').trim() || undefined,
    };
    try {
      await api(`/transactions${editingTransaction ? `/${editingTransaction.id}` : ''}`, {
        method: editingTransaction ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditingTransaction(null);
      setToast(editingTransaction ? 'Đã cập nhật khoản thu chi.' : 'Đã ghi nhận khoản thu chi.');
      await Promise.all([loadLedger(), loadOverview()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được khoản thu chi.');
    }
  }

  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      date: String(form.get('date')),
      quantity: Number(form.get('quantity')),
      note: String(form.get('note') ?? '').trim() || undefined,
    };
    try {
      await api(`/sales${editingSale ? `/${editingSale.id}` : ''}`, {
        method: editingSale ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditingSale(null);
      setToast(editingSale ? 'Đã cập nhật số tô bán.' : 'Đã ghi nhận số tô bán.');
      await Promise.all([loadLedger(), loadOverview()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được bản ghi bán mỳ.');
    }
  }

  async function removeItem(path: string, label: string) {
    if (!window.confirm(`Xóa ${label}? Khoản thu tự động liên kết (nếu có) cũng được cập nhật.`)) return;
    try {
      await api(path, { method: 'DELETE' });
      setToast('Đã chuyển vào lịch sử xóa.');
      await Promise.all([loadLedger(), loadOverview()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được dữ liệu.');
    }
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const saved = await api<Employee>(`/employees${editingEmployee ? `/${editingEmployee.id}` : ''}`, {
        method: editingEmployee ? 'PATCH' : 'POST',
        body: JSON.stringify({ fullName: String(form.get('fullName')).trim() }),
      });
      formElement.reset();
      setEditingEmployee(null);
      setSelectedEmployeeId(saved.id);
      setToast(editingEmployee ? 'Đã cập nhật tên nhân viên.' : 'Đã thêm nhân viên.');
      await loadEmployees();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được nhân viên.');
    }
  }

  async function removeEmployee(employee: Employee) {
    if (!window.confirm(`Xóa nhân viên ${employee.fullName}? Lịch sử các khoản lương đã ghi vẫn được giữ.`)) return;
    try {
      await api(`/employees/${employee.id}`, { method: 'DELETE' });
      const remaining = employees.filter((item) => item.id !== employee.id);
      setEmployees(remaining);
      setSelectedEmployeeId(remaining[0]?.id ?? null);
      if (editingEmployee?.id === employee.id) setEditingEmployee(null);
      setToast('Đã xóa nhân viên.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được nhân viên.');
    }
  }

  async function saveEmployeePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedEmployeeId === null) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(
        `/employees/${selectedEmployeeId}/payments${editingEmployeePayment ? `/${editingEmployeePayment.id}` : ''}`,
        {
          method: editingEmployeePayment ? 'PATCH' : 'POST',
          body: JSON.stringify({
            month: `${String(form.get('month'))}-01`,
            amount: Number(form.get('amount')),
          }),
        },
      );
      setEditingEmployeePayment(null);
      setToast(editingEmployeePayment ? 'Đã cập nhật khoản lương.' : 'Đã ghi nhận khoản lương.');
      await Promise.all([
        loadEmployeePayments(selectedEmployeeId),
        loadLedger(),
        loadOverview(),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được khoản lương.');
    }
  }

  async function removeEmployeePayment(payment: EmployeePayment) {
    if (selectedEmployeeId === null) return;
    if (!window.confirm(`Xóa khoản lương ${money(payment.amount)} tháng ${payment.month.slice(0, 7)}? Khoản Chi liên kết cũng được chuyển vào lịch sử xóa.`)) return;
    try {
      await api(`/employees/${selectedEmployeeId}/payments/${payment.id}`, { method: 'DELETE' });
      if (editingEmployeePayment?.id === payment.id) setEditingEmployeePayment(null);
      setToast('Đã xóa khoản lương.');
      await Promise.all([
        loadEmployeePayments(selectedEmployeeId),
        loadLedger(),
        loadOverview(),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được khoản lương.');
    }
  }

  const monthLabel = useMemo(() => new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }), [selectedMonth]);
  const ledgerMonthLabel = useMemo(() => new Date(`${date.slice(0, 7)}-01T00:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }), [date]);

  if (!ready) return <div className="loading-screen"><LoaderCircle className="spin" /></div>;
  if (!user) return <Login onLogin={onLogin} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('overview'); }}>
          <span className="brand-mark"><Soup size={23} /></span><span><b>SỔ QUÁN</b><small>MỲ QUẢNG</small></span>
        </a>
        <div className="nav-caption">MENU CHÍNH</div>
        <nav className="side-nav">
          <button className={page === 'overview' ? 'active' : ''} onClick={() => setPage('overview')}><ChartNoAxesCombined size={18} /> Tổng quan</button>
          <button className={page === 'ledger' ? 'active' : ''} onClick={() => setPage('ledger')}><ReceiptText size={18} /> Sổ thu chi</button>
          <button className={page === 'employees' ? 'active' : ''} onClick={() => setPage('employees')}><Users size={18} /> Nhân viên</button>
          <button className={page === 'reports' ? 'active' : ''} onClick={() => setPage('reports')}><TrendingUp size={18} /> Báo cáo</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="shop-chip"><span className="status-dot" /> <span><b>Quán đang hoạt động</b><small>Chỉ thành viên truy cập</small></span></div>
          <button className="profile" onClick={logout}>
            <span className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-name"><b>{user.fullName}</b><small>Thành viên</small></span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Quán Mỳ Quảng</span><span className="crumb-slash">/</span><b>{page === 'overview' ? 'Tổng quan' : page === 'ledger' ? 'Sổ thu chi' : page === 'employees' ? 'Nhân viên' : 'Báo cáo'}</b></div>
          <div className="top-actions">
            <span className="today-tag"><span className="status-dot" /> Dữ liệu được đồng bộ</span>
            <button className="mobile-profile" title="Đăng xuất" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>

        <div className="page-wrap">
          {error && <div className="alert error page-alert"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
          {page === 'overview' && (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">SỔ SÁCH KINH DOANH</span><h1>Tổng quan</h1><p className="muted">Một ngày bán hàng tốt bắt đầu từ sổ sách rõ ràng.</p></div>
                <label className="date-picker"><CalendarDays size={17} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              </div>
              <div className="section-title"><span>NGÀY ĐANG CHỌN</span><i /> <small>{displayDate(date)}</small></div>
              <div className="stats-grid">
                <StatCard label="Tổng thu" value={dashboard?.day.income} icon={<ArrowDownLeft />} tone="green" footer="Bao gồm doanh thu bán mỳ" />
                <StatCard label="Tổng chi" value={dashboard?.day.expense} icon={<ArrowUpRight />} tone="orange" footer="Các khoản chi đã ghi nhận" />
                <StatCard label="Chênh lệch thu chi" value={dashboard?.day.net} icon={<ArrowLeftRight />} tone="blue" footer="Tổng thu trừ tổng chi" />
                <StatCard label="Số tô mỳ đã bán" value={dashboard?.day.bowls} icon={<Soup />} tone="yellow" footer={`Doanh thu mỳ ${money(dashboard?.day.noodleRevenue ?? 0)}`} bowls />
              </div>
              <div className="overview-lower">
                <section className="panel month-panel">
                  <div className="panel-heading"><div><span className="eyebrow">TỔNG KẾT</span><h2>Thu chi trong tháng</h2></div><label className="month-picker"><CalendarDays size={15} /><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /></label></div>
                  <div className="month-stats">
                    <div><span>Tổng thu</span><b>{money(dashboard?.month.income ?? 0)}</b></div>
                    <div><span>Tổng chi</span><b>{money(dashboard?.month.expense ?? 0)}</b></div>
                    <div className="month-net"><span>Chênh lệch</span><b>{money(dashboard?.month.net ?? 0)}</b></div>
                    <div><span>Số tô mỳ</span><b>{new Intl.NumberFormat('vi-VN').format(dashboard?.month.bowls ?? 0)} tô</b></div>
                  </div>
                  <div className="month-note"><Coffee size={17} /> Cứ ghi đủ mỗi ngày, cuối tháng xem lại thật dễ.</div>
                </section>
                <section className="panel share-panel">
                  <div className="panel-heading"><div><span className="eyebrow">PHÂN CHIA THAM KHẢO</span><h2>Lãi theo tỷ lệ vốn góp</h2></div><CircleDollarSign className="heading-icon" size={20} /></div>
                  <p className="muted small">Tính theo chênh lệch thu chi dương; tháng đang xem: {monthLabel}.</p>
                  <div className="share-column-head"><span>Thành viên</span><span>{monthLabel}</span><span>Lũy kế</span></div>
                  <div className="share-row">
                    <span><i className="share-dot operator" /><span className="share-person">Người vận hành<small>{money(business?.operator_capital ?? 10000000)} vốn · {Number(business?.owner_profit_percent ?? 66.67).toLocaleString('vi-VN')}%</small></span></span>
                    <b>{money(dashboard?.month.operatorShare ?? 0)}</b><b>{money(dashboard?.lifetime.operatorShare ?? 0)}</b>
                  </div>
                  <div className="share-row">
                    <span><i className="share-dot partner" /><span className="share-person">Người góp vốn<small>{money(business?.partner_capital ?? 5000000)} vốn · {Number(business?.partner_profit_percent ?? 33.33).toLocaleString('vi-VN')}%</small></span></span>
                    <b>{money(dashboard?.month.partnerShare ?? 0)}</b><b>{money(dashboard?.lifetime.partnerShare ?? 0)}</b>
                  </div>
                  <div className="share-net-summary"><span>Chênh lệch thu chi tháng <b>{money(dashboard?.month.net ?? 0)}</b></span><span>Lũy kế <b>{money(dashboard?.lifetime.net ?? 0)}</b></span></div>
                  <div className={`payroll-status ${(dashboard?.month.pendingEmployeeCount ?? 0) > 0 ? 'pending' : 'included'}`}>
                    <Wallet size={15} />
                    <span>
                      {(dashboard?.month.activeEmployeeCount ?? 0) === 0
                        ? 'Chưa có nhân viên để tính tiền nhân viên.'
                        : (dashboard?.month.pendingEmployeeCount ?? 0) > 0
                          ? `Chưa tính tiền nhân viên: còn ${dashboard?.month.pendingEmployeeCount} người chưa ghi nhận khoản trả trong tháng này.`
                          : 'Đã tính tiền nhân viên cho tháng này.'}
                    </span>
                  </div>
                  <div className="capital-note"><Wallet size={16} /> Vốn góp ban đầu: {money(business?.initial_capital ?? 15000000)} <span>·</span> Không tính vào doanh thu</div>
                </section>
              </div>
            </>
          )}

          {page === 'ledger' && (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">GHI NHẬN HẰNG NGÀY</span><h1>Sổ thu chi</h1><p className="muted">Thu, chi và số tô bán được ghi riêng, dễ đối chiếu.</p></div>
                <label className="date-picker"><CalendarDays size={17} /><input type="month" value={date.slice(0, 7)} onChange={(e) => setDate(`${e.target.value}-01`)} /></label>
              </div>
              <div className="entry-grid">
                <section className="panel entry-panel">
                  <div className="entry-heading"><span className="entry-icon income-icon"><ArrowDownLeft size={19} /></span><div><h2>{editingTransaction ? 'Sửa khoản thu chi' : 'Ghi khoản thu chi'}</h2><p>Khoản thu khác hoặc các chi phí trong ngày.</p></div></div>
                  <form className="entry-form" onSubmit={saveTransaction}>
                    <div className="segmented">
                      <button type="button" className={entryType === 'income' ? 'selected income-selected' : ''} onClick={() => setEntryType('income')}>Khoản thu</button>
                      <button type="button" className={entryType === 'expense' ? 'selected expense-selected' : ''} onClick={() => setEntryType('expense')}>Khoản chi</button>
                    </div>
                    <label>Số tiền (₫)<input name="amount" type="number" min="1" step="1" placeholder="Ví dụ: 150000" defaultValue={editingTransaction ? Number(editingTransaction.amount) : ''} required key={`amount-${editingTransaction?.id ?? 'new'}`} /></label>
                    <label>Nội dung<input name="description" maxLength={255} placeholder="Ví dụ: Mua rau, thịt, gas..." defaultValue={editingTransaction?.description ?? ''} required key={`desc-${editingTransaction?.id ?? 'new'}`} /></label>
                    <div className="form-row">
                      <label>Ngày<input name="date" type="date" defaultValue={editingTransaction?.date.slice(0, 10) ?? date} required key={`date-${editingTransaction?.id ?? 'new'}`} /></label>
                      <label>Ghi chú <span className="optional">Không bắt buộc</span><input name="note" placeholder="Thêm ghi chú..." defaultValue={editingTransaction?.note ?? ''} key={`note-${editingTransaction?.id ?? 'new'}`} /></label>
                    </div>
                    <div className="form-actions">
                      {editingTransaction && <button className="button subtle" type="button" onClick={() => setEditingTransaction(null)}>Hủy sửa</button>}
                      <button className="button primary" type="submit"><Plus size={17} /> {editingTransaction ? 'Lưu thay đổi' : 'Ghi vào sổ'}</button>
                    </div>
                  </form>
                </section>
                <section className="panel entry-panel sales-entry">
                  <div className="entry-heading"><span className="entry-icon sale-icon"><Soup size={19} /></span><div><h2>{editingSale ? 'Sửa số tô bán' : 'Ghi số tô mỳ bán'}</h2><p>Doanh thu tự động vào sổ thu, không ghi trùng.</p></div></div>
                  <form className="entry-form" onSubmit={saveSale}>
                    <div className="sale-price"><span>Giá bán mặc định</span><b>{money(business?.noodle_price ?? 25000)} <small>/ tô</small></b></div>
                    <label>Số tô bán được<input name="quantity" type="number" min="1" step="1" placeholder="Ví dụ: 35" defaultValue={editingSale?.quantity ?? ''} required key={`quantity-${editingSale?.id ?? 'new'}`} /></label>
                    <label>Ngày bán<input name="date" type="date" defaultValue={editingSale?.date.slice(0, 10) ?? date} required key={`sale-date-${editingSale?.id ?? 'new'}`} /></label>
                    <label>Ghi chú <span className="optional">Không bắt buộc</span><input name="note" placeholder="Thêm ghi chú..." defaultValue={editingSale?.note ?? ''} key={`sale-note-${editingSale?.id ?? 'new'}`} /></label>
                    <div className="form-actions">
                      {editingSale && <button className="button subtle" type="button" onClick={() => setEditingSale(null)}>Hủy sửa</button>}
                      <button className="button primary" type="submit"><Plus size={17} /> {editingSale ? 'Lưu thay đổi' : 'Ghi số tô bán'}</button>
                    </div>
                  </form>
                </section>
              </div>
              <section className="panel table-panel">
                <div className="panel-heading table-heading"><div><span className="eyebrow">LỊCH SỬ GIAO DỊCH</span><h2>Thu chi · {ledgerMonthLabel}</h2></div><span className="count-pill">{transactions.length} giao dịch</span></div>
                <div className="table-scroll"><table><thead><tr><th>Ngày</th><th>Nội dung</th><th>Loại</th><th className="align-right">Số tiền</th><th className="align-right">Thao tác</th></tr></thead>
                  <tbody>{transactions.length === 0 ? <tr><td colSpan={5} className="empty-row">Chưa có giao dịch trong tháng này.</td></tr> : transactions.map((item) => (
                    <tr key={item.id}>
                      <td className="date-cell">{displayDate(item.date)}</td><td><b>{item.description}</b>{item.note && <small className="row-note">{item.note}</small>}</td>
                      <td><span className={`type-badge ${item.source_type === 'daily_sale' ? 'badge-sale' : item.type === 'income' ? 'badge-income' : 'badge-expense'}`}>{item.source_type === 'daily_sale' ? 'Bán mỳ' : item.source_type === 'employee_salary' ? 'Lương' : item.type === 'income' ? 'Thu' : 'Chi'}</span></td>
                      <td className={`align-right amount-cell ${item.type === 'income' ? 'income-text' : ''}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</td>
                      <td className="align-right row-actions">{item.source_type === 'manual' ? <>
                        <button aria-label="Sửa giao dịch" onClick={() => { setEditingTransaction(item); setEntryType(item.type); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ChevronDown size={16} /></button>
                        <button aria-label="Xóa giao dịch" onClick={() => void removeItem(`/transactions/${item.id}`, 'khoản thu chi này')}><Trash2 size={16} /></button>
                      </> : <span className="auto-label"><Check size={14} /> {item.source_type === 'employee_salary' ? 'Lương nhân viên' : 'Tự động'}</span>}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </section>
              <section className="panel table-panel">
                <div className="panel-heading table-heading"><div><span className="eyebrow">NHẬT KÝ BÁN HÀNG</span><h2>Số tô mỳ · {ledgerMonthLabel}</h2></div><span className="count-pill">{sales.length} lần ghi</span></div>
                <div className="table-scroll"><table><thead><tr><th>Ngày bán</th><th>Số tô</th><th>Giá / tô</th><th className="align-right">Doanh thu</th><th className="align-right">Thao tác</th></tr></thead>
                  <tbody>{sales.length === 0 ? <tr><td colSpan={5} className="empty-row">Chưa ghi nhận số tô bán trong tháng này.</td></tr> : sales.map((sale) => (
                    <tr key={sale.id}><td className="date-cell">{displayDate(sale.date)}</td><td><b>{sale.quantity} tô</b>{sale.note && <small className="row-note">{sale.note}</small>}</td><td>{money(sale.unitPrice)}</td><td className="align-right amount-cell income-text">+{money(sale.amount)}</td>
                      <td className="align-right row-actions"><button aria-label="Sửa số tô bán" onClick={() => { setEditingSale(sale); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ChevronDown size={16} /></button><button aria-label="Xóa số tô bán" onClick={() => void removeItem(`/sales/${sale.id}`, 'bản ghi bán mỳ này')}><Trash2 size={16} /></button></td></tr>
                  ))}</tbody>
                </table></div>
              </section>
            </>
          )}

          {page === 'employees' && (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">QUẢN LÝ NHÂN SỰ</span><h1>Nhân viên</h1><p className="muted">Quản lý tên nhân viên và các khoản tiền đã trả theo tháng.</p></div>
              </div>
              <div className="employee-layout simple-employees">
                <div className="employee-left-column">
                  <section className="panel employee-form-panel">
                    <div className="entry-heading"><span className="entry-icon income-icon"><UserRoundPlus size={19} /></span><div><h2>{editingEmployee ? 'Sửa tên nhân viên' : 'Thêm nhân viên'}</h2><p>Chỉ cần lưu tên nhân viên.</p></div></div>
                    <form className="entry-form" onSubmit={saveEmployee}>
                      <label>Họ và tên<input name="fullName" maxLength={150} placeholder="Tên nhân viên" defaultValue={editingEmployee?.fullName ?? ''} required key={`employee-name-${editingEmployee?.id ?? 'new'}`} /></label>
                      <div className="form-actions">
                        {editingEmployee && <button className="button subtle" type="button" onClick={() => setEditingEmployee(null)}>Hủy</button>}
                        <button className="button primary" type="submit"><Plus size={17} /> {editingEmployee ? 'Lưu tên' : 'Thêm nhân viên'}</button>
                      </div>
                    </form>
                  </section>
                  <section className="panel employee-table-panel employee-list-panel">
                    <div className="panel-heading table-heading"><div><span className="eyebrow">DANH SÁCH</span><h2>Nhân viên</h2></div><span className="count-pill">{employees.length}</span></div>
                    <div className="employee-list">{employees.length === 0 ? <div className="empty-row">Chưa có nhân viên.</div> : employees.map((employee) => (
                      <div className={`employee-list-row ${selectedEmployeeId === employee.id ? 'selected' : ''}`} key={employee.id}>
                        <button className="employee-select" onClick={() => { setSelectedEmployeeId(employee.id); setEditingEmployeePayment(null); }}>
                          <span className="avatar">{employee.fullName.slice(0, 1).toUpperCase()}</span><b>{employee.fullName}</b>
                        </button>
                        <button className="icon-button" aria-label="Sửa tên nhân viên" title="Sửa tên" onClick={() => setEditingEmployee(employee)}><Pencil size={15} /></button>
                        <button className="icon-button delete" aria-label="Xóa nhân viên" title="Xóa nhân viên" onClick={() => void removeEmployee(employee)}><Trash2 size={15} /></button>
                      </div>
                    ))}</div>
                  </section>
                </div>
                <div className="employee-right-column">
                  {selectedEmployeeId !== null && (
                    <>
                      <section className="panel employee-form-panel">
                        <div className="entry-heading"><span className="entry-icon sale-icon"><Wallet size={19} /></span><div><h2>{editingEmployeePayment ? 'Sửa khoản đã trả' : 'Ghi khoản đã trả'}</h2><p>{employees.find((employee) => employee.id === selectedEmployeeId)?.fullName} · khoản trả được ghi vào Chi.</p></div></div>
                        <form className="entry-form payment-form" onSubmit={saveEmployeePayment}>
                          <div className="form-row">
                            <label>Tháng<input name="month" type="month" defaultValue={editingEmployeePayment?.month.slice(0, 7) ?? employeeMonth} required key={`payment-month-${editingEmployeePayment?.id ?? 'new'}`} /></label>
                            <label>Số tiền đã trả (₫)<input name="amount" type="number" min="1" step="1" placeholder="Ví dụ: 6000000" defaultValue={editingEmployeePayment ? Number(editingEmployeePayment.amount) : ''} required key={`payment-amount-${editingEmployeePayment?.id ?? 'new'}`} /></label>
                          </div>
                          <div className="form-actions">
                            {editingEmployeePayment && <button className="button subtle" type="button" onClick={() => setEditingEmployeePayment(null)}>Hủy sửa</button>}
                            <button className="button primary" type="submit"><Plus size={17} /> {editingEmployeePayment ? 'Lưu khoản trả' : 'Ghi khoản trả'}</button>
                          </div>
                        </form>
                      </section>
                      <section className="panel employee-table-panel">
                        <div className="panel-heading table-heading"><div><span className="eyebrow">LỊCH SỬ THANH TOÁN</span><h2>{employees.find((employee) => employee.id === selectedEmployeeId)?.fullName}</h2></div><span className="count-pill">{employeePayments.length} khoản</span></div>
                        <div className="table-scroll"><table><thead><tr><th>Tháng</th><th className="align-right">Số tiền đã trả</th><th className="align-right">Thao tác</th></tr></thead>
                          <tbody>{employeePayments.length === 0 ? <tr><td colSpan={3} className="empty-row">Chưa ghi nhận khoản trả nào.</td></tr> : employeePayments.map((payment) => (
                            <tr key={payment.id}><td className="date-cell">{new Date(`${payment.month.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</td>
                              <td className="align-right amount-cell">{money(payment.amount)}</td>
                              <td className="align-right row-actions"><button aria-label="Sửa khoản trả" onClick={() => setEditingEmployeePayment(payment)}><Pencil size={15} /></button><button aria-label="Xóa khoản trả" onClick={() => void removeEmployeePayment(payment)}><Trash2 size={15} /></button></td>
                            </tr>
                          ))}</tbody>
                        </table></div>
                        <p className="payroll-note"><CircleDollarSign size={16} /> Mỗi nhân viên có thể có một khoản trả cho mỗi tháng. Sửa hoặc xóa tại đây sẽ cập nhật Chi liên kết.</p>
                      </section>
                    </>
                  )}
                  {selectedEmployeeId === null && <section className="panel employee-empty"><Users size={25} /><b>Chọn nhân viên</b><span>Thêm hoặc chọn nhân viên để quản lý các khoản đã trả.</span></section>}
                </div>
              </div>
            </>
          )}

          {page === 'reports' && (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">NHÌN LẠI ĐƯỜNG DÀI</span><h1>Báo cáo</h1><p className="muted">Tổng hợp thu chi và số tô bán theo khoảng ngày.</p></div>
                <div className="range-picker"><label>Từ ngày<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><span>—</span><label>Đến ngày<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
              </div>
              <div className="report-summary">
                <ReportTotal label="Tổng thu" value={report.reduce((sum, item) => sum + item.income, 0)} tone="green" />
                <ReportTotal label="Tổng chi" value={report.reduce((sum, item) => sum + item.expense, 0)} tone="orange" />
                <ReportTotal label="Chênh lệch thu chi" value={report.reduce((sum, item) => sum + item.net, 0)} tone="blue" />
                <ReportTotal label="Tổng tô bán" value={report.reduce((sum, item) => sum + item.bowls, 0)} tone="yellow" bowls />
              </div>
              <section className="panel table-panel report-table">
                <div className="panel-heading table-heading"><div><span className="eyebrow">CHI TIẾT THEO NGÀY</span><h2>{displayDate(from)} – {displayDate(to)}</h2></div><span className="count-pill">{report.length} ngày có giao dịch</span></div>
                <div className="table-scroll"><table><thead><tr><th>Ngày</th><th className="align-right">Tổng thu</th><th className="align-right">Tổng chi</th><th className="align-right">Chênh lệch</th><th className="align-right">Số tô mỳ</th><th className="align-right">Doanh thu mỳ</th></tr></thead>
                  <tbody>{report.length === 0 ? <tr><td colSpan={6} className="empty-row">Không có dữ liệu trong khoảng thời gian này.</td></tr> : report.map((row) => (
                    <tr key={row.date}><td className="date-cell">{displayDate(row.date)}</td><td className="align-right income-text">{money(row.income)}</td><td className="align-right">{money(row.expense)}</td><td className={`align-right amount-cell ${row.net >= 0 ? 'income-text' : 'expense-text'}`}>{money(row.net)}</td><td className="align-right">{row.bowls}</td><td className="align-right">{money(row.noodle_revenue)}</td></tr>
                  ))}</tbody>
                </table></div>
              </section>
              <div className="report-footnote"><CircleDollarSign size={17} /> Chênh lệch thu chi là chỉ số quản lý dòng tiền đơn giản, không nhất thiết tương đương lợi nhuận kế toán.</div>
            </>
          )}
          {busy && <div className="refresh-indicator"><LoaderCircle className="spin" size={15} /> Đang cập nhật</div>}
        </div>
      </main>
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function StatCard({ label, value, icon, tone, footer, bowls = false }: {
  label: string; value?: number; icon: React.ReactNode; tone: string; footer: string; bowls?: boolean;
}) {
  return <section className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div>
    <div className="stat-value">{bowls ? <>{new Intl.NumberFormat('vi-VN').format(value ?? 0)} <small>tô</small></> : money(value ?? 0)}</div><div className="stat-footer">{footer}</div></section>;
}

function ReportTotal({ label, value, tone, bowls = false }: { label: string; value: number; tone: string; bowls?: boolean }) {
  return <div className="report-total"><span>{label}</span><b className={tone === 'blue' && value < 0 ? 'expense-text' : ''}>{bowls ? `${new Intl.NumberFormat('vi-VN').format(value)} tô` : money(value)}</b></div>;
}

export default App;
