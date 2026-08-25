CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"orderId" varchar(32) NOT NULL,
	"fullName" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(320) NOT NULL,
	"address" text NOT NULL,
	"deliveryLocation" varchar(16) NOT NULL,
	"quantity" integer NOT NULL,
	"note" text,
	"paymentMethod" varchar(16) NOT NULL,
	"bkashNumber" varchar(32),
	"transactionId" varchar(128),
	"bookPrice" integer NOT NULL,
	"deliveryCharge" integer NOT NULL,
	"total" integer NOT NULL,
	"paymentStatus" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'confirmation_pending' NOT NULL,
	"sheetSyncState" varchar(16) DEFAULT 'pending' NOT NULL,
	"sheetSyncError" text,
	"sheetSyncedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderId_unique" UNIQUE("orderId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
