# Zyngine Bot

A powerful Discord bot with a web dashboard for ticket management, AI-powered welcomes, role management, and more.

![Zyngine Bot](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

## Quick Links

| Link | Description |
|------|-------------|
| [Invite Bot](https://discord.com/oauth2/authorize?client_id=1450641481512783882&permissions=8&scope=bot%20applications.commands) | Add Zyngine to your server |
| [Dashboard](https://zyngine-bot-production.up.railway.app) | Manage your server settings |

---

## Features

### Ticket System
- Create multiple ticket panels with categories
- Pre-ticket forms and questions
- Staff claiming and assignment
- HTML transcripts on close
- Priority levels and SLA tracking
- Quick commands with `$` prefix

### AI Welcome Messages
- Unique celebrity-style greetings for new members
- Different personality for each join
- Customizable welcome channel
- Toggle on/off per server

### Role Management
- Auto-roles on member join
- Tiered role approval system
- Role request workflow
- Temporary roles with expiration

### Web Dashboard
- Discord OAuth login
- Configure all bot settings
- View analytics and stats
- Manage tickets remotely

---

## Setup Guide

### Step 1: Invite the Bot

[Click here to invite Zyngine Bot](https://discord.com/oauth2/authorize?client_id=1450641481512783882&permissions=8&scope=bot%20applications.commands)

Select your server and authorize the bot.

### Step 2: Access the Dashboard

1. Go to **[zyngine-bot-production.up.railway.app](https://zyngine-bot-production.up.railway.app)**
2. Click **"Login with Discord"**
3. Authorize the dashboard
4. Select your server

### Step 3: Create a Ticket Panel

1. In the dashboard, go to **Tickets** → **Panels**
2. Click **"+ Create Panel"**
3. Configure your panel settings:
   - Name and description
   - Categories (e.g., Support, Billing, General)
   - Form questions (optional)
   - Staff roles
4. Save the panel
5. Click **"Deploy"** and enter the channel ID where you want the panel

### Step 4: Configure Welcome Messages

1. Go to **Settings** in the dashboard
2. Enable **AI Welcome Messages**
3. Select your welcome channel
4. New members will receive unique celebrity-style greetings!

### Step 5: Set Up Auto-Roles (Optional)

1. Go to **Auto-Roles** tab
2. Click **"+ Add Auto Role"**
3. Select the role to assign
4. Configure delay and requirements
5. Save

---

## Ticket Commands

Use these commands inside ticket channels:

| Command | Description |
|---------|-------------|
| `$close [reason]` | Close ticket with transcript |
| `$rename <name>` | Rename the channel |
| `$add @user` | Add user to ticket |
| `$remove @user` | Remove user from ticket |
| `$addrole @user @role` | Give role to user |
| `$removerole @user @role` | Remove role from user |
| `$claim` | Claim the ticket |
| `$unclaim` | Release the ticket |
| `$priority <level>` | Set priority (low/medium/high/urgent) |
| `$note <text>` | Add private staff note |
| `$transfer <category>` | Move to another category |
| `$ping` | Ping ticket creator |
| `$help` | Show all commands |

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/ticket-panel create` | Create a new ticket panel |
| `/ticket-panel deploy` | Deploy panel to a channel |
| `/ticket-panel list` | List all panels |
| `/ticket-panel delete` | Delete a panel |

---

## Dashboard Features

### Analytics
- Ticket volume and trends
- Response time metrics
- Staff performance leaderboard
- Category breakdown charts

### Tools
- **Canned Responses** - Quick reply templates
- **Tags** - Organize tickets with labels
- **SLA Config** - Response time targets
- **Blacklist** - Block problem users
- **Audit Logs** - Track all actions

---

## Self-Hosting

### Prerequisites
- Node.js 18+
- MongoDB database
- Discord Application
- Anthropic API key (for AI welcomes)

### Bot Setup

```bash
cd bot
cp .env.example .env
# Edit .env with your values
npm install
npm run deploy    # Register commands
npm start
```

### Dashboard Setup

```bash
cd dashboard
cp .env.example .env
# Edit .env with your values
npm install
npm run build
npm start
```

### Environment Variables

#### Bot
| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token |
| `CLIENT_ID` | Application ID |
| `MONGODB_URI` | Database connection |
| `ANTHROPIC_API_KEY` | For AI welcomes |

#### Dashboard
| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Dashboard URL |
| `NEXTAUTH_SECRET` | Session secret |
| `DISCORD_CLIENT_ID` | OAuth client ID |
| `DISCORD_CLIENT_SECRET` | OAuth secret |
| `DISCORD_BOT_TOKEN` | For panel deploy |
| `MONGODB_URI` | Database connection |

---

## Support

Need help? Open an issue on GitHub or join our support server.

---

Made with Claude AI assistance
