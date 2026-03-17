const db = require("../../config/db");
// GET PROFILE
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  const query = `
  SELECT username,email
  FROM users
  WHERE id = ?
  `;
  db.get(query,[userId],(err,row)=>{
    if(err){
      return res.status(500).json(err);
    }
    if(!row){
      return res.status(404).json({message:"User not found"});
    }
    res.json(row);
  });
};
// UPDATE PROFILE
exports.updateProfile = (req,res)=>{
  console.log(req.user);
  const userId = req.user.id;
  const {username,email} = req.body;
  const query = `
  UPDATE users
  SET username = ?, email = ?
  WHERE id = ?
  `;
  db.run(query,[username,email,userId],function(err){

    if(err){
      return res.status(500).json(err);
    }

    res.json({message:"Profile updated successfully"});

  });

}