// 1. โหลดไลบรารี Supabase เข้ามาอัตโนมัติ
(function loadSupabase() {
  if (typeof supabase === 'undefined' && !document.getElementById('supabase-sdk')) {
    const script = document.createElement('script');
    script.id = 'supabase-sdk';
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    document.head.appendChild(script);
  }
})();

// 2. ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://xlgvmeenzbmsnnlthvqa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8BJAqUFOBXyGGaCeZucJSQ_0Tcc5A0V';

let supabaseClient = null;

// ฟังก์ชันดึง Supabase Client
function getClient() {
  if (!supabaseClient && typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

window.DB = {
  // ส่งออก getClient ให้หน้าอื่นเรียกใช้
  getClient,

  // ระบบเข้าสู่ระบบ (รองรับ 3 โรล: admin, staff, customer)
  async login(username, password) {
    // 1. ตรวจสอบรหัสผ่านเฉพาะสำหรับ แอดมิน (666) และ พนักงาน (555)
    if (password === '666') {
      return { success: true, role: 'admin', username: username || 'Admin' };
    }
    if (password === '555') {
      return { success: true, role: 'staff', username: username || 'Staff' };
    }

    const client = getClient();

    // 2. ตรวจสอบข้อมูลลูกค้าจาก Supabase
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error || !data) return { success: false };
      return {
        success: true,
        role: data.role || 'customer',
        username: data.username,
        userData: data
      };
    }

    // 3. สำรอง: หาก Supabase ยังไม่พร้อม ให้ดึงจาก LocalStorage
    const users = JSON.parse(localStorage.getItem('users_db')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return { success: false };

    return {
      success: true,
      role: user.role || 'customer',
      username: user.username,
      userData: user
    };
  },

  // ระบบสมัครสมาชิก (กำหนดบทบาทเป็น customer เสมอ)
  async register(userData) {
    const client = getClient();

    const newUser = {
      ...userData,
      role: userData.role || 'customer'
    };

    // บันทึกลง Supabase
    if (client) {
      const { data: existingUser } = await client
        .from('users')
        .select('username')
        .eq('username', newUser.username)
        .maybeSingle();

      if (existingUser) throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');

      const { error } = await client.from('users').insert([newUser]);
      if (error) throw new Error(error.message);
      return true;
    }

    // สำรอง: บันทึกลง LocalStorage
    let users = JSON.parse(localStorage.getItem('users_db')) || [];
    if (users.some(u => u.username === newUser.username)) {
      throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }
    users.push(newUser);
    localStorage.setItem('users_db', JSON.stringify(users));
    return true;
  }
};