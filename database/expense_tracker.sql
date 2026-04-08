-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 27, 2026 at 02:49 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `expense_tracker`
--

-- --------------------------------------------------------

--
-- Table structure for table `alerts`
--

CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `threshold_percent` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alerts`
--

INSERT INTO `alerts` (`alert_id`, `user_id`, `budget_id`, `threshold_percent`) VALUES
(10, 1, 1, 88),
(11, 1, 1, 8),
(12, 1, 5, 8),
(14, 2, 10, 77),
(15, 2, 11, 65),
(16, 8, 15, 77);

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

CREATE TABLE `budgets` (
  `budget_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `spent` decimal(10,2) DEFAULT 0.00,
  `month` int(11) DEFAULT 1,
  `color` varchar(7) DEFAULT '#ffcc00',
  `is_system_generated` tinyint(1) NOT NULL DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `budgets`
--

INSERT INTO `budgets` (`budget_id`, `user_id`, `name`, `icon`, `amount`, `spent`, `month`, `color`, `is_system_generated`, `start_date`, `end_date`) VALUES
(1, 1, 'Monthly Budget', NULL, 9750.00, 0.00, 3, '#ffcc00', 1, '2026-03-01', '2026-03-31'),
(2, 1, 'Transport', '🚗', 77.00, 0.00, 1, '#ffcc00', 0, NULL, NULL),
(3, 1, 'Electronics', '📱', 77.00, 0.00, 1, '#ffcc00', 0, NULL, NULL),
(4, 1, 'Health', '🏥', 777.00, 0.00, 1, '#ffcc00', 0, NULL, NULL),
(5, 1, 'Transport', '🚗', 77.00, 0.00, 1, '#ffcc00', 0, NULL, NULL),
(7, 1, 'akshaya', '🚗', 60.00, 0.00, 1, '#ffcc00', 0, NULL, NULL),
(10, 2, 'Finance', '🛒', 5555.00, 0.00, 3, '#ffcc00', 0, NULL, NULL),
(11, 2, 'Monthly Budget', NULL, 5000.00, 0.00, 3, '#ffcc00', 1, '2026-03-01', '2026-03-31'),
(12, 8, 'Monthly Budget', NULL, 5000.00, 0.00, 3, '#ffcc00', 1, '2026-03-01', '2026-03-31'),
(13, 8, 'Monthly Budget', NULL, 5000.00, 0.00, 3, '#ffcc00', 1, '2026-03-01', '2026-03-31'),
(14, 8, 'Monthly Budget', NULL, 5000.00, 0.00, 3, '#ffcc00', 1, '2026-03-01', '2026-03-31'),
(15, 8, 'Home', '🏠', 777.00, 0.00, 3, '#ffcc00', 0, '2026-03-01', '2026-03-31');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `icon` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `user_id`, `name`, `type`, `created_at`, `icon`) VALUES
(1, 1, 'General', 'expense', '2026-03-23 17:17:03', NULL),
(2, 1, 'akshaya', 'expense', '2026-03-26 06:52:33', '🚗'),
(3, 1, 'Health', 'expense', '2026-03-26 11:13:53', '❤️'),
(4, 2, 'Food', 'expense', '2026-03-27 08:18:40', '🍽️'),
(5, 2, 'Home', 'expense', '2026-03-27 08:33:50', '🏠'),
(6, 2, 'Finance', 'expense', '2026-03-27 09:54:48', '💰'),
(7, 1, 'Codex Budget Smoke', 'expense', '2026-03-27 10:12:50', '🧪'),
(8, 8, 'Home', 'expense', '2026-03-27 13:39:17', '🏠');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `expense_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otps`
--

CREATE TABLE `otps` (
  `otp_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `purpose` varchar(50) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recurring_payments`
--

CREATE TABLE `recurring_payments` (
  `recurring_payment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(20) NOT NULL,
  `description` varchar(255) NOT NULL,
  `frequency` varchar(20) NOT NULL,
  `custom_interval_days` int(11) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `next_run_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recurring_payments`
--

INSERT INTO `recurring_payments` (`recurring_payment_id`, `user_id`, `category_id`, `amount`, `type`, `description`, `frequency`, `custom_interval_days`, `start_date`, `end_date`, `next_run_date`, `is_active`, `created_at`) VALUES
(1, 1, 2, 666.00, 'expense', 'Health', 'Weekly', NULL, '2026-03-27', '2026-03-29', '2026-04-03', 0, '2026-03-27 00:30:22'),
(2, 2, 4, 88.00, 'expense', 'Food', 'Weekly', NULL, '2026-03-27', '2026-03-31', '2026-04-03', 0, '2026-03-27 14:03:16');

-- --------------------------------------------------------

--
-- Table structure for table `recurring_payment_exceptions`
--

CREATE TABLE `recurring_payment_exceptions` (
  `recurring_payment_exception_id` int(11) NOT NULL,
  `recurring_payment_id` int(11) NOT NULL,
  `occurrence_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recurring_payment_exceptions`
--

INSERT INTO `recurring_payment_exceptions` (`recurring_payment_exception_id`, `recurring_payment_id`, `occurrence_date`, `created_at`) VALUES
(1, 1, '2026-03-27', '2026-03-27 00:30:42'),
(2, 2, '2026-03-27', '2026-03-27 17:45:11');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `transaction_date` date NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `recurring_payment_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`transaction_id`, `user_id`, `category_id`, `amount`, `type`, `description`, `transaction_date`, `created_at`, `recurring_payment_id`) VALUES
(11, 1, 2, 88888.00, 'income', 'Salary', '2026-03-26', '2026-03-26 19:22:03', NULL),
(14, 1, 2, 89.00, 'expense', 'Health', '2026-03-27', '2026-03-27 00:12:18', NULL),
(15, 1, 2, 88.00, 'expense', 'Health', '2026-03-27', '2026-03-27 00:21:04', NULL),
(19, 2, 5, 99.00, 'expense', 'Home', '2026-03-27', '2026-03-27 14:03:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `is_verified`, `created_at`) VALUES
(1, 'Test User', 'test@example.com', '$2b$10$9UPAUOWQOKbbT3g1/LT3TeL5ZZQ82CGKtVrrVW/Zcu4BFUgFvuQia', 1, '2026-03-23 17:17:03'),
(2, '240310', 'chinthalavinayasri@gmail.com', '$2b$10$1Eg/hjeqtWUSiIsk.3rdZ.DdQ1ErcRiQ2OTZZZsaAZ7j8bWVmeWp.', 1, '2026-03-25 13:49:41'),
(8, '240315', 'vinayasrichinthala@gmail.com', '$2b$10$voCyLqJNRLVp9P.VaIkYbOkY5aZkrtaOojrl9TFlOmfoM.L131/xy', 1, '2026-03-27 13:27:33');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alerts`
--
ALTER TABLE `alerts`
  ADD PRIMARY KEY (`alert_id`),
  ADD KEY `budget_id` (`budget_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`budget_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `user_id_month` (`user_id`,`month`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `uniq_categories_user_type_name` (`user_id`,`type`,`name`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`),
  ADD KEY `budget_id` (`budget_id`);

--
-- Indexes for table `otps`
--
ALTER TABLE `otps`
  ADD PRIMARY KEY (`otp_id`),
  ADD KEY `email` (`email`),
  ADD KEY `purpose` (`purpose`);

--
-- Indexes for table `recurring_payments`
--
ALTER TABLE `recurring_payments`
  ADD PRIMARY KEY (`recurring_payment_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `next_run_date` (`next_run_date`);

--
-- Indexes for table `recurring_payment_exceptions`
--
ALTER TABLE `recurring_payment_exceptions`
  ADD PRIMARY KEY (`recurring_payment_exception_id`),
  ADD UNIQUE KEY `recurring_payment_occurrence` (`recurring_payment_id`,`occurrence_date`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alerts`
--
ALTER TABLE `alerts`
  MODIFY `alert_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `expense_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otps`
--
ALTER TABLE `otps`
  MODIFY `otp_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `recurring_payments`
--
ALTER TABLE `recurring_payments`
  MODIFY `recurring_payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `recurring_payment_exceptions`
--
ALTER TABLE `recurring_payment_exceptions`
  MODIFY `recurring_payment_exception_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alerts`
--
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`budget_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`budget_id`) ON DELETE CASCADE;

--
-- Constraints for table `otps`
--
ALTER TABLE `otps`
  ADD CONSTRAINT `otps_ibfk_1` FOREIGN KEY (`email`) REFERENCES `users` (`email`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
