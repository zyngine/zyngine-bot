# 🛡️ Zyngine Bot

The ultimate Discord role management bot with auto-roles, request systems, tiered approvals, and a powerful web dashboard.

![Zyngine Bot](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

## ✨ Features

### 🤖 Auto-Roles
- Automatically assign roles when members join
- Configurable delay before assignment
- Minimum account age requirements
- Welcome DM with custom messages

### 📋 Role Request System
- Members can request roles with reasons
- Tiered approval workflow
- Requirement checks (messages, account age, existing roles)
- Approval/denial notifications

### 🎖️ Direct Role Management
- `/role give` - Assign roles directly
- `/role remove` - Remove roles
- `/role temp` - Temporary roles that auto-expire
- `/role swap` - Replace one role with another
- Bulk role operations

### 🎯 Button & Reaction Roles
- Create self-serve role menus
- Multiple modes: normal, unique, verify, drop
- Custom buttons with styles and emojis

### 📊 Analytics & Logging
- Complete audit trail
- Activity logs
- Request statistics
- Export capabilities

### 🌐 Web Dashboard
- Discord OAuth2 authentication
- Configure all bot settings
- View pending requests
- Real-time management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB database
- Discord Bot Token

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/zyngine-bot.git
cd zyngine-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Deploy commands
```bash
cd bot
npm run deploy        # Deploy to test guild
npm run deploy:global # Deploy globally (production)
```

### 5. Start the bot
```bash
npm run bot      # Start bot only
npm run dashboard:dev  # Start dashboard only
npm run dev      # Start both
```

---

## 📁 Project Structure

```
zyngine-bot/
├── bot/                    # Discord bot
│   ├── src/
│   │   ├── commands/       # Slash commands
│   │   │   ├── user/       # User commands
│   │   │   ├── mod/        # Moderator commands
│   │   │   └── admin/      # Admin commands
│   │   ├── events/         # Discord events
│   │   ├── utils/          # Utilities
│   │   ├── structures/     # Classes
│   │   └── index.js        # Entry point
│   └── package.json
│
├── dashboard/              # Next.js web dashboard
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── package.json
│
├── shared/                 # Shared code
│   └── schemas.js         # MongoDB schemas
│
├── .env.example
├── package.json
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ |
| `CLIENT_ID` | Application Client ID | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret | ✅ |
| `NEXTAUTH_SECRET` | Random string for session encryption | ✅ |
| `NEXTAUTH_URL` | Dashboard URL | ✅ |
| `GUILD_ID` | Test server ID (development only) | ❌ |

### Discord Bot Permissions

Required permissions integer: `268435456`

- Manage Roles
- Send Messages
- Embed Links
- Read Message History
- Add Reactions
- Use Slash Commands

---

## 🚂 Deployment to Railway

### Bot Deployment

1. **Create a new project** on [Railway](https://railway.app)

2. **Connect your GitHub repository**

3. **Add environment variables** in Railway dashboard

4. **Configure the service:**
   - Root Directory: `bot`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Deploy!**

### Dashboard Deployment

1. **Create another service** in the same project

2. **Configure the service:**
   - Root Directory: `dashboard`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Add environment variables** including:
   - `NEXTAUTH_URL` = your Railway dashboard URL

4. **Generate a domain** in Railway settings

### MongoDB Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist Railway's IP (or use 0.0.0.0/0 for development)
4. Get your connection string
5. Add to Railway environment variables

---

## 📝 Commands Reference

### User Commands
| Command | Description |
|---------|-------------|
| `/request-role` | Request a role for approval |
| `/my-requests` | View your request history |
| `/cancel-request` | Cancel a pending request |
| `/available-roles` | See requestable roles |

### Moderator Commands
| Command | Description |
|---------|-------------|
| `/role give` | Give a role to a user |
| `/role remove` | Remove a role from a user |
| `/role temp` | Give a temporary role |
| `/role give-multiple` | Bulk give roles |
| `/role swap` | Swap roles on a user |
| `/role list` | List user's roles |
| `/role info` | Get role information |
| `/role members` | List role members |
| `/approve` | Approve a role request |
| `/deny` | Deny a role request |
| `/pending` | View pending requests |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/setup-autorole add` | Add an auto-role |
| `/setup-autorole remove` | Remove an auto-role |
| `/setup-autorole list` | List auto-roles |
| `/setup-tier` | Configure role tiers |
| `/buttonrole create` | Create button roles |
| `/reactionrole create` | Create reaction roles |
| `/setup-notifications` | Configure notifications |
| `/audit` | View audit logs |
| `/export-logs` | Export activity logs |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [Invite Bot](https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands)
- [Support Server](https://discord.gg/zyngine)
- [Documentation](https://docs.zyngine.bot)
- [Dashboard](https://zyngine.bot/dashboard)

---

Made with ❤️ by the Zyngine Team
