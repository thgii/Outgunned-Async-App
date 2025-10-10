INSERT OR REPLACE INTO users (id,name,email,createdAt) VALUES
('demo-user','Demo User','demo@example.com', datetime('now'));

INSERT OR REPLACE INTO campaigns (id,title,system,ownerId,heatEnabled,createdAt) VALUES
('demo-camp','Demo Campaign','Adventure','demo-user',1, datetime('now'));

INSERT OR REPLACE INTO games (id,campaignId,title,status,options,createdAt) VALUES
('demo-game','demo-camp','Demo Game','active','{}', datetime('now'));

INSERT OR REPLACE INTO memberships (userId,gameId,role) VALUES
('demo-user','demo-game','GM');

INSERT OR REPLACE INTO characters (id,campaignId,ownerId,name,attributes,skills,createdAt) VALUES
('char-1','demo-camp','demo-user','Riley Storm',
 '{"Brawn":2,"Finesse":3,"Brains":2,"Grit":2}',
 '{"Athletics":2,"Drive":1,"Shoot":2}', datetime('now'));
