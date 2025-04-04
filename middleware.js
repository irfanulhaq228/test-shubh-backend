const jwt = require("jsonwebtoken");
const adminModel = require("./Models/AdminModel");
const userModel = require("./Models/UserModel");
const staffModel = require("./Models/StaffModel");

const checkDomain = async (req, res, next) => {
    // return next();
    const origin = req.headers.origin;
    // console.log("requested Domain ==> ", origin);

    if (!origin) {
        return res.status(400).json({ error: "No origin header found" });
    }

    try {
        const admin = await adminModel.findOne({ domain: origin, verified: true });

        if (!admin) {
            if (origin === process.env.ADMIN_WEBSITE) {
                if (req.headers.authorization) {
                    const token = req.headers.authorization.split(' ')[1];
                    return jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
                        if (err) {
                            return res.status(400).json({ message: 'Failed, error in jwt token' });
                        };
                        console.log("decoded ", decoded)
                        const adm = await adminModel.findOne({ _id: decoded.adminId, verified: true });
                        if (!adm) {
                            const master = await staffModel.findOne({ _id: decoded.merchantId, verified: true });
                            if (!master) {
                                return res.status(400).json({ message: 'Failed, this is not admin/master' });
                            };
                            req.adminId = master._id.toHexString();
                            req.masterId = true;
                            return next();
                        }
                        req.adminId = adm._id.toHexString();
                        return next();
                    });
                } else {
                    return next();
                }
            } else if (origin === process.env.SUPERADMIN_WEBSITE) {
                return next();
            } else {
                console.log(process.env.ADMIN_WEBSITE);
                console.log(process.env.SUPERADMIN_WEBSITE);
                return res.status(400).json({ error: "Website is Disabled" });
            }
        } else {
            req.adminId = admin._id.toHexString();
            if (req.headers.authorization) {
                const token = req.headers.authorization.split(' ')[1];
                return jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
                    const phone = await staffModel.findOne({ admin: admin._id, type: "main" });
                    if (err) {
                        return res.status(400).json({ message: 'Failed, no token', phone: phone?.phone || null });
                    }

                    if (decoded.id) {
                        const user = await userModel.findOne({ _id: decoded.id, admin: admin._id, disabled: false });
                        if (!user) {
                            return res.status(400).json({ message: 'Failed, wrong token', phone: phone?.phone || null });
                        }
                        return next();
                    } else {
                        return res.status(400).json({ message: 'Failed', phone: phone?.phone || null });
                    }
                });
            } else {
                return next();
            }
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = checkDomain;
