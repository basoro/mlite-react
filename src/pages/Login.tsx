import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, ArrowRight, ShieldCheck, Loader2, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import WhatsappOtpService from '@/lib/whatsappOtp';
import OtpInput from 'react-otp-input';
import { getMasterList } from '@/lib/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP States
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userData, setUserData] = useState<any>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: 'Error',
        description: 'Username dan password harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const requireOtp = import.meta.env.VITE_REQUIRE_OTP === 'true';
      
      // Pass false for otpVerified initially
      const result = await login(username, password, false);
      
      if (result.token) {
        if (requireOtp) {
          // Temporarily store credentials for later full login
          setUserData({ ...result, username, password });
          
          try {
            // Setup temp auth headers to fetch user details
            const authHeaders = {
              'Authorization': `Bearer ${result.token}`,
              'Content-Type': 'application/json',
              'X-Api-Key': import.meta.env.VITE_API_KEY || 'YOUR_API_KEY_HERE',
              'X-Username-Permission': import.meta.env.VITE_API_USERNAME || username,
              'X-Password-Permission': import.meta.env.VITE_API_PASSWORD || password
            };
            
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://mlite.loc';
            const apiPath = import.meta.env.VITE_API_PATH || '/admin';
            
            // Fetch both dokter and petugas data to ensure we find the user regardless of role
            const [dokterResponse, petugasResponse] = await Promise.all([
              getMasterList('dokter', 1, 10, username, authHeaders).catch(() => ({ data: [] })),
              getMasterList('petugas', 1, 10, username, authHeaders).catch(() => ({ data: [] }))
            ]);
            
            const dokterList = dokterResponse.data || (Array.isArray(dokterResponse) ? dokterResponse : []);
            const petugasList = petugasResponse.data || (Array.isArray(petugasResponse) ? petugasResponse : []);
            
            // Combine both lists and find the user
            const combinedList = [...dokterList, ...petugasList];
            const userDetail = combinedList.find((u: any) => 
              u.kd_dokter === username || u.nip === username
            );

            console.log('Phone Number:', userDetail?.no_telp);

            // Handle invalid phone numbers (empty, '0', or too short)
            const isValidPhone = userDetail && 
                               userDetail.no_telp && 
                               userDetail.no_telp !== '0' && 
                               userDetail.no_telp !== '-' && 
                               userDetail.no_telp.length > 5;

            if (isValidPhone) {
              const phone = userDetail.no_telp;
              setPhoneNumber(phone);
                            
              // Send OTP
              const otpResult = await WhatsappOtpService.sendOTP(phone, username);
              
              if (otpResult.success) {
                // Save OTP to DB
                try {
                  await fetch(`${baseUrl}${apiPath}/api/master/save/mlite_users`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                      id: result.id || username,
                      otp_code: otpResult.otp,
                      otp_expires: otpResult.expiresAt
                    })
                  });
                } catch (saveError) {
                  console.warn('Failed to save OTP to DB, but proceeding with local verification', saveError);
                }

                setShowOtp(true);
                toast({
                  title: 'OTP Terkirim',
                  description: `Kode OTP telah dikirim ke WhatsApp ${phone}`,
                });
              } else {
                toast({
                  title: 'Error',
                  description: 'Gagal mengirim OTP WhatsApp',
                  variant: 'destructive',
                });
              }
            } else {
              toast({
                title: 'Error',
                description: 'Nomor WhatsApp tidak ditemukan di profil Anda. Silakan hubungi IT.',
                variant: 'destructive',
              });
            }
          } catch (fetchError) {
            console.error('Error fetching user phone:', fetchError);
            toast({
              title: 'Error',
              description: 'Gagal mengambil data profil pengguna untuk OTP.',
              variant: 'destructive',
            });
          }
        } else {
          // Normal login without OTP
          // Re-login with otpVerified = true to set user context properly
          await login(username, password, true);
          toast({
            title: 'Berhasil',
            description: `Selamat datang di ${import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia'}`,
          });
          navigate('/');
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || result.message || 'Username atau password salah',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan, silakan coba lagi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtpToPhone = async (phone: string, uname: string) => {
    try {
      setIsLoading(true);
      await WhatsappOtpService.sendOTP(phone, uname);
      setShowOtp(true);
      toast({
        title: 'OTP Terkirim',
        description: `Kode OTP telah dikirim ke WhatsApp ${phone}`,
      });
    } catch (error: any) {
      toast({
        title: 'Gagal Mengirim OTP',
        description: error.message || 'Silakan coba lagi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtpClick = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'Nomor WhatsApp harus diisi',
        variant: 'destructive',
      });
      return;
    }
    await sendOtpToPhone(phoneNumber, username);
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        title: 'Error',
        description: 'Kode OTP harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const verifyResult = await WhatsappOtpService.verifyOTP(phoneNumber, username, otp);
      
      if (verifyResult.success) {
        // Re-login to actually set the user in context since we verified
        await login(username, password, true);
        
        toast({
          title: 'Verifikasi Berhasil',
          description: `Selamat datang di ${import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia'}`,
        });
        navigate('/');
      } else {
        toast({
          title: 'Verifikasi Gagal',
          description: verifyResult.error || 'Kode OTP tidak valid',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat verifikasi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Heart className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sidebar-foreground font-bold text-2xl">mLITE</h1>
            <p className="text-sidebar-muted text-sm">{import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Sistem Informasi<br />
            Manajemen Klinik<br />
            <span className="text-primary">Terintegrasi</span>
          </h2>
          <p className="text-sidebar-muted text-lg max-w-md">
            Kelola data pasien, jadwal, pemeriksaan, resep, dan billing dalam satu platform yang mudah digunakan.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-sidebar-accent border-2 border-sidebar flex items-center justify-center"
                >
                  <span className="text-sidebar-muted text-xs font-medium">U{i}</span>
                </div>
              ))}
            </div>
            <p className="text-sidebar-muted text-sm">
              Dipercaya oleh <span className="text-sidebar-foreground font-semibold">500+</span> Fasilitas Kesehatan
            </p>
          </div>
        </div>

        <p className="text-sidebar-muted text-sm">
          © {new Date().getFullYear()} {import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia'}. Hak Cipta Dilindungi.
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-foreground font-bold text-xl">{import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia'}</h1>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">
              {showOtp ? 'Verifikasi OTP' : 'Selamat Datang'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {showOtp 
                ? 'Masukkan kode OTP yang dikirim ke WhatsApp Anda' 
                : 'Masuk ke akun Anda untuk melanjutkan'}
            </p>
          </div>

          {!showOtp ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Lupa password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-6 animate-in slide-in-from-right">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 text-primary bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Masukkan kode OTP 6 digit yang telah dikirim ke WhatsApp
                  </p>
                  <p className="text-lg font-bold text-primary">{phoneNumber}</p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  numInputs={6}
                  renderSeparator={<span className="w-2"></span>}
                  renderInput={(props) => (
                    <input
                      {...props}
                      className="w-10 h-12 text-center text-xl border rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-background"
                    />
                  )}
                  inputType="tel"
                  shouldAutoFocus
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </span>
                  ) : (
                    <>
                      Verifikasi
                      <ShieldCheck className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                <div className="flex justify-between items-center text-sm pt-2">
                  <button
                    type="button"
                    onClick={handleSendOtpClick}
                    disabled={isLoading}
                    className="text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    Kirim Ulang OTP
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtp(false);
                      setOtp('');
                      setUserData(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <a href="#" className="text-primary font-medium hover:underline">
              Hubungi Admin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
