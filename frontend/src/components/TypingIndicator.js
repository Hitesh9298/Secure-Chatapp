import { motion } from "framer-motion";
export default function TypingIndicator({ users }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-gray-500 text-sm italic ml-2"
    >
      {users.join(", ")} typing...
    </motion.div>
  );
}