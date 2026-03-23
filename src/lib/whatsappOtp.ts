import axios from 'axios';

// Initialize global store for OTPs if not exists
if (!(window as any).otpStore) {
  (window as any).otpStore = new Map();
}

class WhatsappOtpService {
  /**
   * Send OTP via WhatsApp
   * @param {string} phoneNumber - User's phone number
   * @param {string} username - User's username
   * @returns {Promise<Object>} - Response with OTP details
   */
  static async sendOTP(phoneNumber: string, username: string) {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Clean phone number (remove leading 0 and add 62)
      let cleanNumber = phoneNumber.replace(/^0/, '62');
      if (!cleanNumber.startsWith('62')) {
        cleanNumber = '62' + cleanNumber;
      }

      // Prepare WhatsApp message
      const appTitle = import.meta.env.VITE_APP_TITLE || 'mLITE Indonesia';
      const message = `Kode OTP untuk login ${appTitle}: ${otp}\n\nKode ini berlaku selama 5 menit.\nJangan berikan kode ini kepada siapa pun.`;

      const waGatewayUrl = import.meta.env.VITE_WA_GATEWAY_URL || 'https://mlite-whatsapp.mlite.id/send';

      console.log('Sending WhatsApp OTP to:', cleanNumber);

      // MENGIRIM REQUEST KE MLITE-WHATSAPP MENGGUNAKAN JSON
      const waResponse = await axios.post(waGatewayUrl, {
        to: cleanNumber,
        message: message
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Cek response berdasarkan format balasan JSON dari mlite-whatsapp
      if (!waResponse.data?.ok) {
         console.warn('WhatsApp Gateway Warning:', waResponse.data);
      }

      // Store OTP with expiration (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const otpData = {
        otp,
        phoneNumber: cleanNumber,
        username,
        expiresAt,
      };

      // Use phone number as key
      (window as any).otpStore.set(cleanNumber, otpData);
      
      console.log('OTP generated:', { username, phoneNumber: cleanNumber, expiresAt: otpData.expiresAt, otp });

      return {
        success: true,
        message: 'OTP sent successfully',
        otp, // Return OTP to caller so they can save it to DB
        cleanNumber,
        expiresAt
      };

    } catch (error) {
      console.error('Error sending WhatsApp OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP received via WhatsApp
   * @param {string} phoneNumber - User's phone number
   * @param {string} username - User's username
   * @param {string} otp - OTP to verify
   * @returns {Promise<Object>} - Response with verification result
   */
  static async verifyOTP(phoneNumber: string, username: string, otp: string) {
    try {
      if (!phoneNumber || !username || !otp) {
        throw new Error('Phone number, username, and OTP are required');
      }

      // Clean phone number (same as in sendOTP)
      let cleanNumber = phoneNumber.replace(/^0/, '62');
      if (!cleanNumber.startsWith('62')) {
        cleanNumber = '62' + cleanNumber;
      }

      console.log('Verifying OTP for:', { username, phoneNumber: cleanNumber, otp });

      // Check OTP format
      if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        return {
          success: false,
          error: 'Invalid OTP format'
        };
      }

      // Get stored OTP data
      const storedOtpData = (window as any).otpStore.get(cleanNumber);
      
      if (!storedOtpData) {
        return {
          success: false,
          error: 'No OTP found for this phone number'
        };
      }

      // Check if OTP has expired
      const now = new Date();
      const expiresAt = new Date(storedOtpData.expiresAt);
      
      if (now > expiresAt) {
        // Remove expired OTP
        (window as any).otpStore.delete(cleanNumber);
        
        return {
          success: false,
          error: 'OTP has expired'
        };
      }

      // Verify OTP
      if (storedOtpData.otp !== otp) {
        return {
          success: false,
          error: 'Invalid OTP'
        };
      }

      // OTP is valid - remove it from store to prevent reuse
      (window as any).otpStore.delete(cleanNumber);

      console.log('OTP verified successfully for:', username);
      
      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Error verifying WhatsApp OTP:', error);
      throw error;
    }
  }
}

export default WhatsappOtpService;