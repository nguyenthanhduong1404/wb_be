const express = require("express");
const app = express();

const cors = require("cors");
const paypal = require("paypal-rest-sdk");
const Bill = require("./src/models/bill.model");
const BillDetail = require("./src/models/billDetail.model");
const Cart = require("./src/models/cart.model");
app.use(
    cors({
        origin: "http://127.0.0.1:5500",
    })
);
paypal.configure({
    mode: "sandbox", //sandbox hoặc live
    client_id: `ATEJB5-BdtNkwbJAXamWDk6tVXccS1o1uY0wmjuunMySB87lH-eNGZngZAcxJ1L5cx6exBPWDKRw4urm`,
    client_secret: `EKX5YvTV_q7GWNZRjvob3wuid4g3Z9AOHmNZn7K1uLHUeM65BLbrbx-T66kXl6Ny-fMOqO4OCtHKQcQM`,
});
app.use(express.json());

app.get("/", (req, res) => {
    res.send("hello");
});
app.post("/api/buy", (req, res) => {
    const newProductList = req.body.productList.map((item) => {
        return {
            name: `${item.idProduct}`,
            sku: req.body.user,
            price: (item.price / item.quantity).toString(),
            currency: "USD",
            quantity: item.quantity,
        };
    });
    let total = 0;
    console.log(req.body.productList)
    if (req.body && req.body.productList.length > 0) {
        total = req.body.productList.reduce((res, current) => {
            return (res += current.price);
        }, 0);
    }
    var create_payment_json = {
        intent: "sale",
        payer: {
            payment_method: "paypal",
        },
        redirect_urls: {
            return_url: "http://localhost:3000/success",
            cancel_url: "http://127.0.0.1:5500/cart.html",
        },
        transactions: [
            {
                item_list: {
                    items: [...newProductList],
                },
                amount: {
                    currency: "USD",
                    total: total.toString(),
                },
                description: "this is description",
            },
        ],
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (var i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") {
                    res.status(200).json({ url: payment.links[i].href });
                    // res.redirect(payment.links[i].href);
                }
            }
        }
    });
});
const getDate = () => {
    const d = new Date();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const yy = d.getFullYear();
    const myDateString = yy + "-" + mm + "-" + dd;
    return myDateString;
};
app.get("/success", (req, res) => {
    var paymentId = req.query.paymentId;
    var payerId = { payer_id: req.query.PayerID };
    paypal.payment.execute(paymentId, payerId, async function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            const date = getDate();
            const idUser = payment.transactions[0].item_list.items[0]?.sku;

            const bill = {
                idUser: +idUser,
                dateBill: date,
            };

            await Bill.createBill(bill, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    if (result.insertId) {
                        const idBill = result.insertId;
                        payment.transactions[0].item_list.items.forEach(
                            async (item, index) => {
                                const idProduct = +item.name;
                                const quantity = +item.quantity;
                                const price = quantity * item.price;
                                const dataBillDetail = {
                                    idBill,
                                    idProduct,
                                    quantity,
                                    price,
                                };
                                await BillDetail.createBillDetail(
                                    dataBillDetail,
                                    (err, result) => {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log(
                                                "create bill detail success"
                                            );
                                        }
                                    }
                                );
                            }
                        );
                        Cart.removeCartByIDUser(idUser, (err, result) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("delete bill  success");
                            }
                        });
                    }
                }
            });
            res.redirect("http://127.0.0.1:5500/purchase-order.html");
        }
    });
});

app.get("/cancel", (req, res) => res.send("Payment canceled!"));
const productRouter = require("./src/routers/product.route");
app.use("/api/product", productRouter);

const customerRouter = require("./src/routers/customer.route");
app.use("/api/customer", customerRouter);

const colorRouter = require("./src/routers/color.route");
app.use("/api/color", colorRouter);

const brandRouter = require("./src/routers/brand.route");
app.use("/api/brand", brandRouter);

const billRouter = require("./src/routers/bill.route");
app.use("/api/bill", billRouter);

const billDetailRouter = require("./src/routers/billDetail.route");
app.use("/api/bill_detail", billDetailRouter);

const cartRouter = require("./src/routers/cart.route");
app.use("/api/cart", cartRouter);

const roleRouter = require("./src/routers/role.route");
// const BillDetail = require("./src/models/billDetail.model");
app.use("/api/role", roleRouter);

const port = 3000;
app.listen(port, () => {
    console.log("Express server is running at port ${port}");
});
