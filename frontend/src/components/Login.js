import React, { useState } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify"; // ✅ Toastify import

export default function Login({ onLogin, onSwitch, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const generateRSAKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    return { publicKeyBase64, privateKeyBase64 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", { email, password });

      const token = res.data.token;
      const username = res.data.user.username;
      const userEmail = res.data.user.email;

      let privateKey = localStorage.getItem("privateKey");
      let publicKey = localStorage.getItem("publicKey");

      if (!privateKey || !publicKey) {
        const { publicKeyBase64, privateKeyBase64 } = await generateRSAKeyPair();
        localStorage.setItem("privateKey", privateKeyBase64);
        localStorage.setItem("publicKey", publicKeyBase64);

        await axios.post(
          "http://localhost:5000/api/uploadPublicKey",
          { publicKey: publicKeyBase64 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("email", userEmail);

      // ✅ Toastify success message
      toast.success(`Welcome back, ${username}! 🎉`, {
        style: {
          borderRadius: "10px",
          background: "linear-gradient(to right, #4f46e5, #3b82f6)",
          color: "#fff",
          fontWeight: 600,
          padding: "12px 16px",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#3b82f6",
        },
      });

      if (onLogin) onLogin(username);
    } catch (err) {
      console.error("❌ Login error:", err);
      const errorMsg = err.response?.data?.error || "Login failed";

      // ❌ Toastify error message
      toast.error(`Login failed: ${errorMsg}`, {
        style: {
          borderRadius: "10px",
          background: "#ef4444",
          color: "#fff",
          fontWeight: 600,
          padding: "12px 16px",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 p-4 relative">
      {/* ❌ Removed Toaster — not needed for Toastify */}

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900 transition-all"
        disabled={loading}
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm font-medium">
            Secure end-to-end encrypted communication
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-base font-semibold rounded-lg py-3.5 transition-all shadow-md ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-[0.98]"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={onSwitch}
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
              disabled={loading}
            >
              Create Account
            </button>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001
              0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541
              3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414
              1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
