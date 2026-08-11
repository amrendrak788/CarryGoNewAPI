const { now } = require("../utils/date");

const seedData = {

    metadata: {

        version: "1.0.0",

        application: "CarryGo",

        environment: "development",

        generatedAt: now()

    },

    users: [

        {
            id: "usr_customer_1",

            name: "Rakesh Jaiswal",

            mobile: "9876543210",

            password: "123456",

            email: null,

            city: "Delhi",

            profilePhoto: null,

            selectedRole: "CUSTOMER",

            isVerified: true,

            isBlocked: false,

            createdAt: now(),

            updatedAt: now(),

            lastLogin: null,

            createdBy: null,

            updatedBy: null,

            isDeleted: false,

            deletedAt: null
        },

        {
            id: "usr_traveller_1",

            name: "Aman Kumar",

            mobile: "9999999999",

            password: "123456",

            email: null,

            city: "Delhi NCR",

            profilePhoto: null,

            selectedRole: "TRAVELLER",

            isVerified: true,

            isBlocked: false,

            createdAt: now(),

            updatedAt: now(),

            lastLogin: null,

            createdBy: null,

            updatedBy: null,

            isDeleted: false,

            deletedAt: null
        }

    ],

    sessions: [],

    travellerProfiles: [

        {

            id: "trav_1",

            userId: "usr_traveller_1",

            rating: 4.8,

            completedTrips: 42,

            vehicleType: "CAR",

            vehicleNumber: "DL01AB1234",

            maxWeight: 30,

            kycVerified: true,

            status: "AVAILABLE",

            createdAt: now(),

            updatedAt: now(),

            createdBy: null,

            updatedBy: null,

            isDeleted: false,

            deletedAt: null

        }

    ],

    wallets: [

        {

            id: "wal_customer_1",

            userId: "usr_customer_1",

            balance: 0,

            currency: "INR",

            updatedAt: now()

        },

        {

            id: "wal_traveller_1",

            userId: "usr_traveller_1",

            balance: 0,

            currency: "INR",

            updatedAt: now()

        }

    ],

    settings: {

        version: "1.0.0",

        currency: "INR",

        otpExpiry: 300,

        maxParcelWeight: 30,

        supportEmail: "support@carrygo.in"

    },

    trips: [

    {

        id: "trip_1",

        travellerId: "usr_traveller_1",

        from: {

            address: "Delhi",

            latitude: 28.6139,

            longitude: 77.2090

        },

        to: {

            address: "Jaipur",

            latitude: 26.9124,

            longitude: 75.7873

        },

        travelDate: "2026-08-10",

        travelTime: "11:30",

        availableWeight: 20,

        pricePerKg: 180,

        status: "ACTIVE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "trip_2",

        travellerId: "usr_traveller_1",

        from: {

            address: "Jaipur",

            latitude: 26.9124,

            longitude: 75.7873

        },

        to: {

            address: "Udaipur",

            latitude: 24.5854,

            longitude: 73.7125

        },

        travelDate: "2026-08-11",

        travelTime: "08:00",

        availableWeight: 15,

        pricePerKg: 200,

        status: "ACTIVE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "trip_3",

        travellerId: "usr_traveller_1",

        from: {

            address: "Delhi",

            latitude: 28.6139,

            longitude: 77.2090

        },

        to: {

            address: "Chandigarh",

            latitude: 30.7333,

            longitude: 76.7794

        },

        travelDate: "2026-08-12",

        travelTime: "06:45",

        availableWeight: 10,

        pricePerKg: 170,

        status: "ACTIVE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "trip_4",

        travellerId: "usr_traveller_1",

        from: {

            address: "Noida",

            latitude: 28.5355,

            longitude: 77.3910

        },

        to: {

            address: "Agra",

            latitude: 27.1767,

            longitude: 78.0081

        },

        travelDate: "2026-08-05",

        travelTime: "07:20",

        availableWeight: 25,

        pricePerKg: 150,

        status: "COMPLETED",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    }

],

    parcels: [

    {

        id: "par_1",

        customerId: "usr_customer_1",

        travellerId: null,

        bookingId: null,

        title: "Laptop Sleeve and Charger",

        description: "Office laptop sleeve with charger",

        senderName: "Rakesh Jaiswal",

        receiverName: "Mohit Jain",

        receiverMobile: "9876543201",

        weight: 1.8,

        weightUnit: "KG",

        payout: 460,

        currency: "INR",

        pickup: {

            address: "Connaught Place, New Delhi",

            latitude: 28.6315,

            longitude: 77.2167

        },

        drop: {

            address: "C-Scheme, Jaipur",

            latitude: 26.9124,

            longitude: 75.7873

        },

        pickupOtp: "4921",

        pickupOtpVerified: false,

        deliveryOtp: "8150",

        deliveryOtpVerified: false,

        status: "AVAILABLE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "par_2",

        customerId: "usr_customer_1",

        travellerId: null,

        bookingId: null,

        title: "Prescription Medicine Pack",

        description: "Urgent medicine parcel",

        senderName: "Rakesh Jaiswal",

        receiverName: "Anjali Mehta",

        receiverMobile: "9876543202",

        weight: 0.8,

        weightUnit: "KG",

        payout: 340,

        currency: "INR",

        pickup: {

            address: "Sector 29, Gurugram",

            latitude: 28.4675,

            longitude: 77.0810

        },

        drop: {

            address: "Vaishali Nagar, Jaipur",

            latitude: 26.9124,

            longitude: 75.7873

        },

        pickupOtp: "3814",

        pickupOtpVerified: false,

        deliveryOtp: "6629",

        deliveryOtpVerified: false,

        status: "AVAILABLE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "par_3",

        customerId: "usr_customer_1",

        travellerId: "usr_traveller_1",

        bookingId: "book_1",

        title: "CA Documents Envelope",

        description: "Important legal documents",

        senderName: "Rakesh Jaiswal",

        receiverName: "Sharma Associates",

        receiverMobile: "9876543203",

        weight: 0.3,

        weightUnit: "KG",

        payout: 260,

        currency: "INR",

        pickup: {

            address: "Noida Sector 62",

            latitude: 28.6280,

            longitude: 77.3649

        },

        drop: {

            address: "MI Road, Jaipur",

            latitude: 26.9167,

            longitude: 75.8167

        },

        pickupOtp: "1492",

        pickupOtpVerified: true,

        deliveryOtp: "7741",

        deliveryOtpVerified: false,

        status: "ACCEPTED",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    },

    {

        id: "par_4",

        customerId: "usr_customer_1",

        travellerId: null,

        bookingId: null,

        title: "Wedding Gift Hamper",

        description: "Glass gift hamper",

        senderName: "Rakesh Jaiswal",

        receiverName: "Sonia Agarwal",

        receiverMobile: "9876543204",

        weight: 2.6,

        weightUnit: "KG",

        payout: 540,

        currency: "INR",

        pickup: {

            address: "Karol Bagh, Delhi",

            latitude: 28.6519,

            longitude: 77.1909

        },

        drop: {

            address: "Bapu Bazaar, Jaipur",

            latitude: 26.9239,

            longitude: 75.8267

        },

        pickupOtp: "2455",

        pickupOtpVerified: false,

        deliveryOtp: "9861",

        deliveryOtpVerified: false,

        status: "AVAILABLE",

        createdAt: now(),

        updatedAt: now(),

        createdBy: null,

        updatedBy: null,

        isDeleted: false,

        deletedAt: null

    }

],

    bookings: [

    {

        id: "book_1",
        parcelId: "par_3",
        tripId: "trip_1",
        customerId: "usr_customer_1",
        travellerId: "usr_traveller_1",
        status: "ACCEPTED",
        requestedAt: now(),
        acceptedAt: now(),
        rejectedAt: null,
        cancelledAt: null,
        completedAt: null,
        createdAt: now(),
        updatedAt: now()

    }

],

    deliveries: [

    {

        id: "del_1",

        parcelId: "par_3",

        bookingId: "book_1",

        currentStatus: "PICKED_UP",

        progress: 40,

        currentLocation: {

            latitude: 27.4500,

            longitude: 76.6500

        },

        lastUpdated: now(),

        history: [

            {

                status: "BOOKED",

                location: "Noida Sector 62",

                timestamp: now()

            },

            {

                status: "ACCEPTED",

                location: "Traveller Accepted",

                timestamp: now()

            },

            {

                status: "PICKED_UP",

                location: "Noida Sector 62",

                timestamp: now()

            }

        ]

    },

    {

        id: "del_2",

        parcelId: "par_1",

        bookingId: null,

        currentStatus: "BOOKED",

        progress: 10,

        currentLocation: {

            latitude: null,

            longitude: null

        },

        lastUpdated: now(),

        history: [

            {

                status: "BOOKED",

                location: "Waiting for traveller",

                timestamp: now()

            }

        ]

    },

    {

        id: "del_3",

        parcelId: "par_2",

        bookingId: null,

        currentStatus: "BOOKED",

        progress: 10,

        currentLocation: {

            latitude: null,

            longitude: null

        },

        lastUpdated: now(),

        history: [

            {

                status: "BOOKED",

                location: "Waiting for traveller",

                timestamp: now()

            }

        ]

    },

    {

        id: "del_4",

        parcelId: "par_4",

        bookingId: null,

        currentStatus: "BOOKED",

        progress: 10,

        currentLocation: {

            latitude: null,

            longitude: null

        },

        lastUpdated: now(),

        history: [

            {

                status: "BOOKED",

                location: "Waiting for traveller",

                timestamp: now()

            }

        ]

    }

],

    transactions: [

    {
        id: "txn_1",
        walletId: "wal_customer_1",
        parcelId: "par_3",
        bookingId: "book_1",
        amount: 260,
        paymentMethod: "UPI",
        type: "DEBIT",
        status: "SUCCESS",
        createdAt: now()
    },

    {
        id: "txn_2",
        walletId: "wal_traveller_1",
        parcelId: "par_3",
        bookingId: "book_1",
        amount: 260,
        paymentMethod: "WALLET",
        type: "CREDIT",
        status: "PENDING",
        createdAt: now()
    }

],

    notifications: [

    {
        id: "not_1",
        userId: "usr_customer_1",
        title: "Parcel Created",
        message: "Your parcel has been created successfully.",
        type: "BOOKING",
        isRead: false,
        createdAt: now()
    },

    {
        id: "not_2",
        userId: "usr_traveller_1",
        title: "New Booking",
        message: "You have received a new parcel booking.",
        type: "BOOKING",
        isRead: false,
        createdAt: now()
    }

],

   reviews: [

    {
        id: "rev_1",
        bookingId: "book_1",
        customerId: "usr_customer_1",
        travellerId: "usr_traveller_1",
        rating: 5,
        review: "Very safe and fast delivery.",
        createdAt: now()
    }

],

   otpLogs: [

    {
        id: "otp_1",
        mobile: "9876543210",
        otp: "4567",
        purpose: "LOGIN",
        verified: true,
        expiresAt: now(),
        createdAt: now()
    }

],

    deviceTokens: [

    {
        id: "dev_1",
        userId: "usr_customer_1",
        platform: "ANDROID",
        deviceId: "android-demo-device",
        firebaseToken: "demo-firebase-token",
        createdAt: now()
    }

],

  supportTickets: [

    {
        id: "sup_1",
        userId: "usr_customer_1",
        title: "Parcel Pickup Delay",
        description: "Pickup was delayed by 30 minutes.",
        status: "OPEN",
        createdAt: now(),
        updatedAt: now()
    }

],

    activityLogs: [

    {
        id: "log_1",
        userId: "usr_customer_1",
        action: "PARCEL_CREATED",
        entity: "parcel",
        entityId: "par_1",
        ipAddress: "127.0.0.1",
        device: "WEB",
        createdAt: now()
    },

    {
        id: "log_2",
        userId: "usr_traveller_1",
        action: "BOOKING_ACCEPTED",
        entity: "booking",
        entityId: "book_1",
        ipAddress: "127.0.0.1",
        device: "ANDROID",
        createdAt: now()
    }

]

};

module.exports = {
    seedData
};